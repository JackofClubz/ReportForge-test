#!/usr/bin/env node

/**
 * Enhanced Mining Report Data Ingestion Script for ReportForge RAG Pipeline
 * 
 * This script processes mining reports (PDF, DOCX, TXT, MD, JSON) and ingests them into 
 * Pinecone vector database for retrieval-augmented generation (RAG).
 * 
 * NEW: Supports structured JSON format with section-based metadata
 * 
 * Prerequisites:
 * - PINECONE_API_KEY environment variable
 * - OPENAI_API_KEY environment variable  
 * - Node.js packages: @pinecone-database/pinecone, openai, compromise, dotenv
 * 
 * Usage:
 * node scripts/ingest-mining-reports.js [--data-dir ./data] [--chunk-size 2000] [--clean] [--format json|md]
 */

const fs = require('fs');
const path = require('path');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const nlp = require('compromise');
require('dotenv').config();

// Configuration
const PINECONE_INDEX = "reportforge-mining-data";
const DEFAULT_DATA_DIR = path.join(__dirname, '../data/mining-reports');
const DEFAULT_JSON_DIR = path.join(__dirname, '../ai-editor 2/ai-editor/data/json_sample');
const DEFAULT_CHUNK_SIZE = 2000;
const BATCH_SIZE = 10; // Process embeddings in batches

// Environment variables
const PINECONE_API_KEY = process.env.PINECONE_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// Command line arguments
const args = process.argv.slice(2);
const format = getArgValue('--format') || 'md';
const dataDir = getArgValue('--data-dir') || (format === 'json' ? DEFAULT_JSON_DIR : DEFAULT_DATA_DIR);
const chunkSize = parseInt(getArgValue('--chunk-size')) || DEFAULT_CHUNK_SIZE;
const shouldClean = args.includes('--clean');
const dryRun = args.includes('--dry-run');

function getArgValue(argName) {
  const index = args.indexOf(argName);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : null;
}

// Validate environment
if (!PINECONE_API_KEY || !OPENAI_API_KEY) {
  console.error('❌ Missing required environment variables:');
  if (!PINECONE_API_KEY) console.error('  - PINECONE_API_KEY');
  if (!OPENAI_API_KEY) console.error('  - OPENAI_API_KEY');
  process.exit(1);
}

console.log(`🚀 Mining Report Ingestion Script`);
console.log(`📂 Data Directory: ${dataDir}`);
console.log(`📊 Format: ${format.toUpperCase()}`);
console.log(`🔢 Chunk Size: ${chunkSize}`);
console.log(`🧹 Clean Mode: ${shouldClean ? 'YES' : 'NO'}`);
console.log(`👀 Dry Run: ${dryRun ? 'YES' : 'NO'}`);

// Initialize clients
const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

let pineconeIndex;

// Detect if a section should be skipped
function isSkippable(text) {
  const lower = text.toLowerCase();
  return (
    lower.includes("not relevant") ||
    lower.includes("not applicable") ||
    lower.includes("no material information") ||
    lower.includes("not provided") ||
    lower.includes("this section is intentionally left blank") ||
    text.trim().length < 50
  );
}

// Enhanced chunking for better context boundaries
function chunkText(text, chunkSize = DEFAULT_CHUNK_SIZE) {
  const paragraphs = text.split(/\n{2,}/);
  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    if (para.length > chunkSize) {
      // Split very large paragraphs at sentence boundaries
      const sentences = para.split(/[.!?]+\s+/);
      for (const sentence of sentences) {
        if (current.length + sentence.length > chunkSize) {
          if (current) chunks.push(current.trim());
          current = sentence;
        } else {
          current += (current ? " " : "") + sentence;
        }
      }
    } else {
      if (current.length + para.length > chunkSize) {
        if (current) chunks.push(current.trim());
        current = para;
      } else {
        current += (current ? "\n\n" : "") + para;
      }
    }
  }

  if (current) chunks.push(current.trim());
  return chunks.filter(chunk => chunk.length > 0);
}

/**
 * Anonymize sensitive information in mining report text
 */
function anonymizeText(text) {
  if (!text) return '';
  
  const doc = nlp(text);
  
  // Use compromise.js for more sophisticated anonymization
  doc.people().replaceWith('[Qualified Person]');
  doc.organizations().replaceWith('[Company]');
  doc.places().replaceWith('[Location]');
  
  // Additional mining-specific patterns
  let anonymized = doc.text()
    // Company names (common patterns)
    .replace(/\b[A-Z][a-z]+ (?:Resources?|Mining|Corporation|Corp\.?|Ltd\.?|Inc\.?|Limited)\b/g, '[Company]')
    .replace(/\b[A-Z][a-z]+ (?:Gold|Silver|Copper|Iron|Diamond|Coal) (?:Mine|Project|Property)\b/g, '[Mine Name]')
    // Person names (professional designations)
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+(?:, P\.Geo\.?|, Ph\.D\.?|, M\.Sc\.?|, B\.Sc\.?)?\b/g, '[Qualified Person]')
    // Specific locations (common mining regions)
    .replace(/\b(?:British Columbia|Ontario|Quebec|Alberta|Nevada|Arizona|Peru|Chile|Australia|Ghana|Yukon|Northwest Territories)\b/g, '[Location]')
    // Project names
    .replace(/\b[A-Z][a-z]+ (?:Mine|Project|Property|Deposit|Zone|Claims?)\b/g, '[Project Name]')
    // Coordinates (approximate)
    .replace(/\b\d{1,3}°\s*\d{1,2}'\s*\d{1,2}"?\s*[NSEW]\b/g, '[Coordinates]')
    .replace(/\b\d{1,3}\.\d+°?\s*[NSEW]\b/g, '[Coordinates]');

  return anonymized;
}

/**
 * Create embedding for text using OpenAI
 */
async function createEmbedding(text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small', // Upgraded from ada-002
      input: text,
    });
    return response.data[0].embedding;
  } catch (error) {
    console.error('❌ Error creating embedding:', error.message);
    throw error;
  }
}

/**
 * Process embeddings in batches to avoid rate limits
 */
async function createEmbeddingsBatch(texts) {
  const embeddings = [];
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    console.log(`  📡 Creating embeddings for batch ${Math.floor(i/BATCH_SIZE) + 1}/${Math.ceil(texts.length/BATCH_SIZE)} (${batch.length} chunks)`);
    
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-small', // Upgraded from ada-002
        input: batch,
      });
      
      embeddings.push(...response.data.map(item => item.embedding));
      
      // Rate limiting: wait a bit between batches
      if (i + BATCH_SIZE < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    } catch (error) {
      console.error(`❌ Error in batch ${Math.floor(i/BATCH_SIZE) + 1}:`, error.message);
      throw error;
    }
  }
  
  return embeddings;
}

/**
 * Read and process a single file
 */
function readFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.txt':
    case '.md':
      return fs.readFileSync(filePath, 'utf-8');
    case '.json':
      // Assume JSON contains a 'content' field
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      return jsonData.content || JSON.stringify(jsonData);
    default:
      console.warn(`⚠️  Unsupported file type: ${ext} (${filePath})`);
      return null;
  }
}

/**
 * Process a single mining report file
 */
async function processFile(filePath) {
  const fileName = path.basename(filePath);
  const fileExt = path.extname(filePath).toLowerCase();
  console.log(`📄 Processing: ${fileName}`);
  
  try {
    let chunks = [];
    
    if (fileExt === '.json') {
      // NEW: Process structured JSON format with sections
      const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      
      if (Array.isArray(jsonData)) {
        // Process each section separately
        for (const section of jsonData) {
          const sectionTitle = section.title || `Section ${section.id}`;
          const sectionText = section.text || '';
          
          console.log(`  📑 Processing section: ${sectionTitle}`);
          
          if (isSkippable(sectionText)) {
            console.log(`  ⏭️  Skipping section: ${sectionTitle} (marked as skippable)`);
            continue;
          }
          
          const anonymizedContent = anonymizeText(sectionText);
          const sectionChunks = chunkText(anonymizedContent, chunkSize);
          
          // Add section-based chunks with enhanced metadata
          for (let i = 0; i < sectionChunks.length; i++) {
            chunks.push({
              id: `${fileName}-${section.id}-${i}`,
              content: sectionChunks[i],
              metadata: {
                filename: fileName,
                section: sectionTitle,
                section_id: section.id,
                chunk_index: i,
                total_chunks: sectionChunks.length,
                file_type: fileExt,
                processed_at: new Date().toISOString(),
              }
            });
          }
        }
      } else {
        console.log(`  ⚠️  Invalid JSON format (expected array): ${fileName}`);
        return { processed: 0, skipped: 1 };
      }
    } else {
      // Read file content for MD/TXT files
      const rawContent = readFile(filePath);
      if (!rawContent) {
        console.log(`  ⏭️  Skipped (unsupported format)`);
        return { processed: 0, skipped: 1 };
      }
      
      // Anonymize content
      const anonymizedContent = anonymizeText(rawContent);
      
      // Chunk the content
      const contentChunks = chunkText(anonymizedContent, chunkSize);
      
      // Create chunk objects with standard metadata
      chunks = contentChunks.map((chunk, index) => ({
        id: `${fileName}-chunk-${index}`,
        content: chunk,
        metadata: {
          filename: fileName,
          chunk_index: index,
          total_chunks: contentChunks.length,
          file_type: fileExt,
          processed_at: new Date().toISOString(),
        }
      }));
    }
    
    console.log(`  📦 Created ${chunks.length} chunks`);
    
    if (chunks.length === 0) {
      console.log(`  ⚠️  No valid chunks created`);
      return { processed: 0, skipped: 1 };
    }
    
    if (dryRun) {
      console.log(`  🔍 [DRY RUN] Would process ${chunks.length} chunks`);
      return { processed: chunks.length, skipped: 0 };
    }
    
    // Create embeddings in batches
    const embeddings = await createEmbeddingsBatch(chunks.map(chunk => chunk.content));
    
    // Prepare vectors for Pinecone with enhanced metadata
    const vectors = chunks.map((chunkObj, index) => ({
      id: chunkObj.id,
      values: embeddings[index],
      metadata: {
        ...chunkObj.metadata,
        text: chunkObj.content,
        type: 'mining-report',
      },
    }));
    
    // Upsert to Pinecone in batches
    const upsertBatchSize = 100;
    for (let i = 0; i < vectors.length; i += upsertBatchSize) {
      const batch = vectors.slice(i, i + upsertBatchSize);
      await pineconeIndex.upsert(batch);
      console.log(`  💾 Upserted batch ${Math.floor(i/upsertBatchSize) + 1}/${Math.ceil(vectors.length/upsertBatchSize)}`);
    }
    
    console.log(`  ✅ Successfully processed ${chunks.length} chunks`);
    return { processed: chunks.length, skipped: 0 };
    
  } catch (error) {
    console.error(`  ❌ Error processing ${fileName}:`, error.message);
    return { processed: 0, skipped: 1, error: error.message };
  }
}

/**
 * Clean existing data from Pinecone index
 */
async function cleanIndex() {
  if (dryRun) {
    console.log('🔍 [DRY RUN] Would clean existing data from index');
    return;
  }
  
  console.log('🧹 Cleaning existing data from Pinecone index...');
  try {
    await pineconeIndex.deleteAll();
    console.log('✅ Index cleaned successfully');
  } catch (error) {
    console.error('❌ Error cleaning index:', error.message);
    throw error;
  }
}

/**
 * Main execution function
 */
async function main() {
  console.log('🚀 ReportForge Mining Report Ingestion');
  console.log('=====================================');
  console.log(`📁 Data directory: ${dataDir}`);
  console.log(`📏 Chunk size: ${chunkSize} characters`);
  console.log(`🗄️  Pinecone index: ${PINECONE_INDEX}`);
  console.log(`🔍 Dry run: ${dryRun ? 'Yes' : 'No'}\n`);
  
  // Check if data directory exists
  if (!fs.existsSync(dataDir)) {
    console.error(`❌ Data directory does not exist: ${dataDir}`);
    console.log(`\n💡 Create the directory and add your mining report files (.txt, .md, .json)`);
    process.exit(1);
  }
  
  // Initialize Pinecone
  console.log('🔗 Connecting to Pinecone...');
  try {
    pineconeIndex = pinecone.index(PINECONE_INDEX);
    console.log('✅ Connected to Pinecone\n');
  } catch (error) {
    console.error('❌ Failed to connect to Pinecone:', error.message);
    console.log(`\n💡 Make sure your PINECONE_API_KEY is correct and the index "${PINECONE_INDEX}" exists`);
    process.exit(1);
  }
  
  // Clean index if requested
  if (shouldClean) {
    await cleanIndex();
    console.log();
  }
  
  // Find all supported files (based on format)
  const supportedExtensions = format === 'json' ? ['.json'] : ['.txt', '.md'];
  const files = fs.readdirSync(dataDir)
    .filter(file => supportedExtensions.includes(path.extname(file).toLowerCase()))
    .map(file => path.join(dataDir, file));
  
  if (files.length === 0) {
    console.log(`📭 No supported files found in ${dataDir}`);
    console.log(`\n💡 Supported formats: ${supportedExtensions.join(', ')}`);
    console.log('Add your mining report files and run the script again.');
    return;
  }
  
  console.log(`📚 Found ${files.length} files to process\n`);
  
  // Process files
  const stats = { totalProcessed: 0, totalSkipped: 0, errors: [] };
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    console.log(`[${i + 1}/${files.length}]`);
    
    const result = await processFile(file);
    stats.totalProcessed += result.processed;
    stats.totalSkipped += result.skipped;
    
    if (result.error) {
      stats.errors.push({ file: path.basename(file), error: result.error });
    }
    
    console.log(); // Empty line between files
  }
  
  // Final summary
  console.log('📊 INGESTION SUMMARY');
  console.log('===================');
  console.log(`✅ Total chunks processed: ${stats.totalProcessed}`);
  console.log(`⏭️  Files skipped: ${stats.totalSkipped}`);
  console.log(`❌ Errors: ${stats.errors.length}`);
  
  if (stats.errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    stats.errors.forEach(({ file, error }) => {
      console.log(`  - ${file}: ${error}`);
    });
  }
  
  if (!dryRun && stats.totalProcessed > 0) {
    console.log(`\n🎉 Successfully ingested ${stats.totalProcessed} chunks into Pinecone!`);
    console.log('Your RAG pipeline is ready for mining report queries.');
  } else if (dryRun) {
    console.log('\n🔍 Dry run completed. Use without --dry-run to actually ingest data.');
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { anonymizeText, chunkText, processFile }; 