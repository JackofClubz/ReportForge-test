import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { Pinecone } from '@pinecone-database/pinecone'
import OpenAI from 'openai'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config()

// RAG API Plugin to handle /api/rag-query requests
const ragApiPlugin = (): Plugin => {
  return {
    name: 'rag-api',
    configureServer(server) {
      // Add a simple health check endpoint first
      server.middlewares.use('/api/health', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
      });

      // Standard AI endpoint for non-RAG requests
      server.middlewares.use('/api/standard-ai', async (req, res, next) => {
        console.log('✨ [STANDARD AI] Request received:', req.method, req.url);
        
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          next();
          return;
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');

        try {
          // Parse request body
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              console.log('✨ [STANDARD AI] Processing request body...');
              const requestData = JSON.parse(body);
              const { query, prompt, systemMessage, maxTokens = 1024, temperature = 0.7 } = requestData;
              
              console.log('✨ [STANDARD AI] Prompt:', prompt?.substring(0, 100) + '...');

              if (!prompt) {
                console.error('❌ [STANDARD AI] Missing prompt parameter');
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing prompt' }));
                return;
              }

              // Get API key from environment
              const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;

              console.log('✨ [STANDARD AI] Checking API key...');
              console.log('🔑 [STANDARD AI] OpenAI key available:', !!openaiKey, 'length:', openaiKey?.length);

              if (!openaiKey) {
                const errorMsg = 'Standard AI service not configured - missing OpenAI API key';
                console.error('❌ [STANDARD AI]', errorMsg);
                res.statusCode = 503;
                res.end(JSON.stringify({ 
                  error: errorMsg,
                  fallback: true 
                }));
                return;
              }

              // Initialize OpenAI client
              console.log('🔧 [STANDARD AI] Initializing OpenAI client...');
              const openai = new OpenAI({ apiKey: openaiKey });

              // Create AI completion
              console.log('🔧 [STANDARD AI] Creating completion...');
              const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                  { role: 'system', content: systemMessage || 'You are a helpful assistant for mining report writing.' },
                  { role: 'user', content: prompt },
                ],
                max_tokens: maxTokens,
                temperature: temperature,
              });

              const answer = completion.choices[0].message.content || 'No response generated';

              console.log('✅ [STANDARD AI] Completion successful');

              // Send successful response
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                answer,
                prompt,
                query
              }));

            } catch (error) {
              console.error('❌ [STANDARD AI] Processing error:', error);
              console.error('❌ [STANDARD AI] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
              res.statusCode = 500;
              res.end(JSON.stringify({ 
                error: 'Standard AI processing failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
                fallback: true 
              }));
            }
          });

        } catch (error) {
          console.error('❌ [STANDARD AI] Request error:', error);
          console.error('❌ [STANDARD AI] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          res.statusCode = 500;
          res.end(JSON.stringify({ 
            error: 'Standard AI service error: ' + (error instanceof Error ? error.message : 'Unknown error'),
            fallback: true 
          }));
        }
      });

      server.middlewares.use('/api/rag-query', async (req, res, next) => {
        console.log('🔍 [RAG API] Request received:', req.method, req.url);
        
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
          res.statusCode = 200;
          res.end();
          return;
        }

        if (req.method !== 'POST') {
          next();
          return;
        }

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        res.setHeader('Content-Type', 'application/json');

        try {
          // Parse request body
          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });

          req.on('end', async () => {
            try {
              console.log('🔍 [RAG API] Processing request body...');
              const requestData = JSON.parse(body);
              const { query, section, userInputs = {}, topK = 7 } = requestData;
              
              console.log('🔍 [RAG API] Query:', query?.substring(0, 100) + '...');
              console.log('🔍 [RAG API] Section:', section);

              if (!query) {
                console.error('❌ [RAG API] Missing query parameter');
                res.statusCode = 400;
                res.end(JSON.stringify({ error: 'Missing query' }));
                return;
              }

              // Get API keys from environment
              const openaiKey = process.env.OPENAI_API_KEY || process.env.VITE_OPENAI_API_KEY;
              const pineconeKey = process.env.PINECONE_API_KEY || process.env.VITE_PINECONE_API_KEY;

              console.log('🔍 [RAG API] Checking API keys...');
              console.log('🔑 [RAG API] OpenAI key available:', !!openaiKey, 'length:', openaiKey?.length);
              console.log('🔑 [RAG API] Pinecone key available:', !!pineconeKey, 'length:', pineconeKey?.length);

              if (!openaiKey || !pineconeKey) {
                const errorMsg = `RAG service not configured - missing API keys. OpenAI: ${!!openaiKey}, Pinecone: ${!!pineconeKey}`;
                console.error('❌ [RAG API]', errorMsg);
                res.statusCode = 503;
                res.end(JSON.stringify({ 
                  error: errorMsg,
                  fallback: true 
                }));
                return;
              }

              // Initialize clients
              console.log('🔧 [RAG API] Initializing Pinecone and OpenAI clients...');
              const pinecone = new Pinecone({ apiKey: pineconeKey });
              const openai = new OpenAI({ apiKey: openaiKey });
              const pineconeIndex = pinecone.index('report-forge-data');

              // Create embedding
              console.log('🔧 [RAG API] Creating embedding for query:', query.substring(0, 100) + '...');
              const embeddingRes = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: query,
              });
              const queryEmbedding = embeddingRes.data[0].embedding;
              console.log('✅ [RAG API] Embedding created, dimensions:', queryEmbedding.length);

              // Query Pinecone
              console.log('🔧 [RAG API] Querying Pinecone index with topK:', topK, 'section:', section);
              const results = await pineconeIndex.query({
                topK,
                vector: queryEmbedding,
                includeMetadata: true,
                filter: section ? { section: { $eq: section } } : undefined,
              });
              console.log('✅ [RAG API] Pinecone query completed, matches:', results.matches?.length || 0);

              const rawChunks = (results.matches || [])
                .map((match: any) => ({
                  text: match.metadata?.text || '',
                  section: match.metadata?.section || 'Unknown',
                  score: match.score || 0,
                }))
                .filter((chunk) => chunk.text);

              if (rawChunks.length === 0) {
                res.statusCode = 404;
                res.end(JSON.stringify({ error: 'No relevant context found.' }));
                return;
              }

              // Create context and get AI response
              const contextText = rawChunks.map(c => c.text).join('\n---\n');
              const systemPrompt = `You are a professional mining report assistant. Use the provided context to expand and improve the user's content for a technical mining report. Maintain professional language and technical accuracy.

Context from mining reports:
${contextText}

User's content: ${query}`;

              const completion = await openai.chat.completions.create({
                model: 'gpt-4o-mini',
                messages: [
                  { role: 'system', content: systemPrompt },
                  { role: 'user', content: `Please expand and improve this content for a mining technical report: ${query}` },
                ],
                max_tokens: 1024,
                temperature: 0.7,
              });

              const answer = completion.choices[0].message.content || 'No response generated';

              // Send successful response
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                answer,
                section,
                userInputs,
                sources: rawChunks.map((chunk, index) => ({
                  section: chunk.section,
                  score: chunk.score,
                  index: index + 1
                }))
              }));

            } catch (error) {
              console.error('❌ [RAG API] Processing error:', error);
              console.error('❌ [RAG API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
              res.statusCode = 500;
              res.end(JSON.stringify({ 
                error: 'RAG processing failed: ' + (error instanceof Error ? error.message : 'Unknown error'),
                fallback: true 
              }));
            }
          });

        } catch (error) {
          console.error('❌ [RAG API] Request error:', error);
          console.error('❌ [RAG API] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          res.statusCode = 500;
          res.end(JSON.stringify({ 
            error: 'RAG service error: ' + (error instanceof Error ? error.message : 'Unknown error'),
            fallback: true 
          }));
        }
      });
    },
  };
};

// Custom plugin for better port management
const portManagerPlugin = (): Plugin => {
  return {
    name: 'port-manager',
    configureServer(server) {
      const originalListen = server.listen.bind(server);
      
      server.listen = function(port?: number, ...args: any[]) {
        const startingPort = port || 3000;
        
        // Log the attempt
        console.log(`\n🚀 [DEV-SERVER] Starting ReportForge development server...`);
        console.log(`📡 [DEV-SERVER] Trying port ${startingPort}...`);
        
        return originalListen(port, ...args).catch((error: any) => {
          if (error.code === 'EADDRINUSE') {
            console.log(`⚠️  [DEV-SERVER] Port ${startingPort} is busy, Vite will find the next available port...`);
          }
          throw error;
        });
      };

      // Track if we've already logged the port to avoid spam
      let portLogged = false;
      
      // Listen for server ready event to log final port
      server.middlewares.use((_req, _res, next) => {
        if (!server.resolvedUrls || portLogged) {
          next();
          return;
        }
        
        // This will run once when server is ready
        const port = server.config.server.port;
        const actualPort = server.resolvedUrls.local[0]?.split(':').pop()?.replace('/', '');
        
        if (actualPort && actualPort !== String(port)) {
          console.log(`✅ [DEV-SERVER] Found available port: ${actualPort}`);
          console.log(`🌐 [DEV-SERVER] ReportForge is running at: http://localhost:${actualPort}`);
        } else {
          console.log(`✅ [DEV-SERVER] ReportForge started successfully on port ${port}`);
        }
        
        portLogged = true;
        next();
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ragApiPlugin(),
    portManagerPlugin()
  ],
  server: {
    port: 3000,
    strictPort: false, // Allow Vite to automatically find next available port
    host: true,
    open: true,
    // Additional port configuration for better control
    cors: true
  },
  build: {
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    }
  },
  optimizeDeps: {
    include: ['react-is']
  }
})
