const express = require('express');
const cors = require('cors');
const { Pinecone } = require('@pinecone-database/pinecone');
const OpenAI = require('openai');
const nlp = require('compromise');
require('dotenv').config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize clients
const pinecone = new Pinecone({ 
  apiKey: process.env.PINECONE_API_KEY || process.env.VITE_PINECONE_API_KEY || '' 
});
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY || '' 
});

let pineconeIndex;

try {
  pineconeIndex = pinecone.index("reportforge-mining-data");
  console.log('✅ Connected to Pinecone index: reportforge-mining-data');
} catch (error) {
  console.error('❌ Failed to connect to Pinecone:', error.message);
}

// Step 1: Anonymize real names/locations from historical text (from ai-editor 2)
function anonymizeText(text) {
  const doc = nlp(text);
  doc.people().replaceWith("[Qualified Person]");
  doc.organizations().replaceWith("[Company]");
  doc.places().replaceWith("[Location]");
  return doc.text();
}

// Step 2: Replace placeholders with user-provided values
function fillPlaceholders(text, userInputs) {
  let result = text;
  for (const [key, values] of Object.entries(userInputs)) {
    const placeholder = `[${key}]`;
    const replacement = values.join(", ");
    result = result.replaceAll(placeholder, replacement);
  }
  return result;
}

// Section detection function (from ai-editor 2)
function detectSection(text) {
  const lower = text.toLowerCase();
  
  if (lower.includes("qualified person")) return "Qualified Person";
  if (lower.includes("sampling")) return "Sampling Techniques";
  if (lower.includes("site visit")) return "Site Visits";
  if (lower.includes("data verification")) return "Data Verification";
  if (lower.includes("mineral resources")) return "Mineral Resource Estimates";
  if (lower.includes("executive summary")) return "Executive Summary";
  if (lower.includes("introduction")) return "Introduction";
  if (lower.includes("property description")) return "Property Description";
  if (lower.includes("geology")) return "Geological Setting";
  if (lower.includes("exploration")) return "Exploration";
  if (lower.includes("drilling")) return "Drilling";
  if (lower.includes("environmental")) return "Environmental Studies";
  if (lower.includes("economic")) return "Economic Analysis";
  
  return undefined;
}

// Extract user inputs function (from ai-editor 2)
function extractUserInputs(text) {
  const userInputs = {};

  // Extract qualified person names
  const qpMatches = text.match(/(?:qualified persons?|qps?)[:\-]?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/gi);
  if (qpMatches) {
    userInputs["Qualified Person"] = qpMatches.map(name => 
      name.replace(/qualified persons?:?\s*/i, "").trim()
    );
  }

  // Extract company names 
  const companyMatches = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Corporation|Corp|Inc|Limited|Ltd|Company|Co))/gi);
  if (companyMatches) {
    userInputs["Company"] = companyMatches;
  }

  // Extract locations
  const locationMatches = text.match(/(?:located|situated|in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z][a-z]+)/gi);
  if (locationMatches) {
    userInputs["Location"] = locationMatches.map(loc => 
      loc.replace(/(?:located|situated|in|at)\s+/i, "").trim()
    );
  }

  return userInputs;
}

// RAG Query endpoint (exactly like ai-editor 2's API route)
app.post('/api/rag-query', async (req, res) => {
  try {
    const { query, section, topK = 7, userInputs = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Missing query" });
    }

    console.log(`🔍 RAG Query: ${query.substring(0, 100)}...`);

    // Auto-detect section if not provided
    const detectedSection = section || detectSection(query);
    if (detectedSection) {
      console.log(`📑 Detected section: ${detectedSection}`);
    }

    // Extract user inputs for personalization
    const extractedInputs = extractUserInputs(query);
    const finalUserInputs = { ...extractedInputs, ...userInputs };

    // Check if we have API keys
    if (!process.env.OPENAI_API_KEY && !process.env.VITE_OPENAI_API_KEY) {
      return res.status(500).json({ 
        error: "Missing OPENAI_API_KEY environment variable" 
      });
    }

    if (!process.env.PINECONE_API_KEY && !process.env.VITE_PINECONE_API_KEY) {
      return res.status(500).json({ 
        error: "Missing PINECONE_API_KEY environment variable" 
      });
    }

    // Step 3: Embed the query
    const embeddingRes = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });
    const queryEmbedding = embeddingRes.data[0].embedding;

    // Step 4: Query Pinecone (with optional section filtering)
    const results = await pineconeIndex.query({
      topK,
      vector: queryEmbedding,
      includeMetadata: true,
      filter: detectedSection ? { section: { $eq: detectedSection } } : undefined,
    });

    const rawChunks = (results.matches || [])
      .map((match) => ({
        text: match.metadata?.text || "",
        section: match.metadata?.section || "Unknown",
        score: match.score || 0,
      }))
      .filter((chunk) => chunk.text);

    console.log(`📊 Found ${rawChunks.length} relevant chunks`);

    if (rawChunks.length === 0) {
      return res.status(404).json({ error: "No relevant context found." });
    }

    // Step 5: Anonymize all retrieved chunks
    const anonymizedChunks = rawChunks.map((c) => anonymizeText(c.text));
    const contextText = anonymizedChunks.join("\n---\n");

    // Step 6: Compose the RAG prompt (from ai-editor 2)
    const systemPrompt = `
You are an AI assistant helping write mining technical reports (JORC And NI 43-101). Your job is to expand a section or subsection using information from multiple reports.
Use only the context below. Generalize across different documents. 

- Anonymize all real-world data such as:
  - People's names → {{PersonName}}
  - Organizations → {{CompanyName}}
  - Locations and coordinates → {{Location}}, {{Latitude}}, {{Longitude}}
  - Minerals → {{MineralType}}
  - Dates → {{Dates}}
  - Years → {{Year}}
  - Amounts → {{Amount}}
  - Percentages → {{Percentage}}
  - Places → {{Location}}

- If the user provides values for any of these placeholders, use them in place of the placeholders but only in relevant places.
- Otherwise leave the placeholder as-is.
- If a section has multiple common subsections, include them as headings.
- If the user selects a subsection, return detailed content just for that part.
- Format the output in clean Markdown and remove any unnecessary formatting from the text.
- Use numbered or bulleted lists if applicable
- Do not include any other text apart from the generated section

Context:
${contextText}

Question: ${query}

Answer:
`.trim();

    // Step 7: Generate answer using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a helpful assistant that generates mining report sections for JORC And NI 43-101 reports." },
        { role: "user", content: systemPrompt },
      ],
      max_tokens: 512,
      temperature: 0.2,
    });

    let answer = completion.choices[0].message.content || "";

    console.log(`✅ Generated response: ${answer.length} characters`);

    // Return response in same format as ai-editor 2
    res.json({
      answer,
      context: anonymizedChunks,
      section: detectedSection || null,
      userInputs: finalUserInputs,
      sources: rawChunks.slice(0, 3).map((chunk, index) => ({
        section: chunk.section,
        score: Math.round(chunk.score * 100) / 100,
        index: index + 1
      })),
      filled: Object.keys(finalUserInputs).length > 0,
    });

  } catch (error) {
    console.error('❌ RAG Error:', error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : 'RAG query failed' 
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'ReportForge RAG API is running',
    timestamp: new Date().toISOString(),
    env: {
      hasOpenAI: !!(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY),
      hasPinecone: !!(process.env.PINECONE_API_KEY || process.env.VITE_PINECONE_API_KEY),
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 ReportForge RAG API server running on http://localhost:${PORT}`);
  console.log(`📡 RAG endpoint: http://localhost:${PORT}/api/rag-query`);
  console.log(`💚 Health check: http://localhost:${PORT}/api/health`);
  
  // Environment check
  const hasOpenAI = !!(process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY);
  const hasPinecone = !!(process.env.PINECONE_API_KEY || process.env.VITE_PINECONE_API_KEY);
  
  console.log(`🔑 OpenAI API Key: ${hasOpenAI ? '✅ Found' : '❌ Missing'}`);
  console.log(`🔑 Pinecone API Key: ${hasPinecone ? '✅ Found' : '❌ Missing'}`);
  
  if (!hasOpenAI || !hasPinecone) {
    console.log('⚠️  Add API keys to .env file to enable RAG functionality');
  }
});