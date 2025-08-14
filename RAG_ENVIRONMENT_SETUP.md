# RAG Integration Environment Setup

## Required Environment Variables

To use the RAG (Retrieval-Augmented Generation) features, you need to add the following environment variables:

### Supabase Edge Functions Environment

Add these to your Supabase project's Edge Function secrets:

```bash
PINECONE_API_KEY=your_pinecone_api_key
OPENAI_API_KEY=your_openai_api_key
```

### How to Add Environment Variables to Supabase

1. Go to your Supabase dashboard
2. Navigate to "Edge Functions" 
3. Click on "Settings" or "Environment Variables"
4. Add the above variables

### Getting API Keys

**Pinecone API Key:**
1. Sign up at https://www.pinecone.io/
2. Create a new project
3. Create an index named `reportforge-mining-data`
   - Dimensions: 1536 (for OpenAI text-embedding-ada-002)
   - Metric: cosine
4. Go to API Keys and copy your key

**OpenAI API Key:**
1. Sign up at https://platform.openai.com/
2. Go to API Keys section
3. Create a new secret key
4. Copy the key (starts with `sk-`)

### Testing the Setup

1. Make sure your Supabase Edge Functions are deployed:
   ```bash
   supabase functions deploy rag-query
   ```

2. Test the RAG query function in the Supabase dashboard

3. In ReportForge, open a report editor and try the "🔍 Expand using RAG" feature

### Data Ingestion

To populate your Pinecone database with mining reports:

1. Create a folder: `data/mining-reports/`
2. Add your mining report files (.txt, .md, .json)
3. Install additional dependencies:
   ```bash
   npm install @pinecone-database/pinecone openai compromise dotenv
   ```
4. Run the ingestion script:
   ```bash
   node scripts/ingest-mining-reports.js --data-dir ./data/mining-reports
   ```

### Troubleshooting

- **CORS errors**: Make sure your Supabase project allows your domain
- **API key errors**: Double-check that keys are properly set in Supabase Edge Functions
- **No RAG results**: Ensure you have data ingested in your Pinecone index
- **Embedding errors**: Verify your OpenAI API key has credits and proper permissions 