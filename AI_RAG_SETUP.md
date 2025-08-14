# AI and RAG Integration Setup Guide

This guide explains how to set up and use the advanced AI and RAG (Retrieval-Augmented Generation) features in ReportForge, based on the Liveblocks AI Editor example.

## 🚀 Features Added

### ✨ **Enhanced AI Assistant**
- **RAG-Powered Expansion**: Uses mining report database for context-aware content generation
- **Mining-Specific Prompts**: 25+ specialized prompts for mining reports (JORC/NI 43-101)
- **Smart Content Generation**: Section-specific content, methodology, risk assessment
- **Multiple Languages**: Translation support for technical content
- **Quality Assurance**: Accuracy checks, terminology validation, fact verification

### 🔍 **RAG Pipeline**
- **Pinecone Vector Database**: Stores embeddings of historical mining reports
- **Smart Anonymization**: Automatically anonymizes company names, locations, personnel
- **Context Retrieval**: Finds relevant content from similar mining projects
- **OpenAI Embeddings**: Uses text-embedding-ada-002 for semantic search

### 🎨 **Enhanced UI**
- **AI Panel**: Comprehensive AI assistant interface
- **Prompt Menu**: Organized prompts by category (Enhancement, Generation, Modification, QA)
- **Response Actions**: Copy, Insert, Replace, Regenerate AI responses
- **Real-time Streaming**: Live AI response generation
- **Mobile Responsive**: Works on all devices

## 📋 Prerequisites

### Required Services
1. **Pinecone Account**: For vector database storage
2. **OpenAI Account**: For embeddings and chat completions
3. **Supabase Project**: Your existing ReportForge setup

### Required Packages
Add these to your `package.json`:
```json
{
  "dependencies": {
    "@pinecone-database/pinecone": "^6.1.2",
    "openai": "^4.104.0",
    "compromise": "^14.14.4"
  }
}
```

Install the packages:
```bash
npm install @pinecone-database/pinecone openai compromise
```

## 🔧 Setup Instructions

### 1. **Environment Variables**

Add these to your `.env` file:

```env
# Existing ReportForge variables...

# AI and RAG Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Optional: Pinecone configuration
PINECONE_INDEX=reportforge-mining-data
PINECONE_ENVIRONMENT=gcp-starter
```

### 2. **Pinecone Setup**

1. **Create Account**: Sign up at [pinecone.io](https://pinecone.io)

2. **Create Index**: 
   - Index name: `reportforge-mining-data`
   - Dimensions: `1536` (for OpenAI text-embedding-ada-002)
   - Metric: `cosine`
   - Environment: Choose your preferred region

3. **Get API Key**: Copy from Pinecone dashboard

### 3. **OpenAI Setup**

1. **Create Account**: Sign up at [platform.openai.com](https://platform.openai.com)
2. **Generate API Key**: Go to API Keys section
3. **Add Credits**: Ensure you have sufficient credits for embeddings and completions

### 4. **Supabase Edge Function Setup**

The RAG query function is already created at `supabase/functions/rag-query/index.ts`. Deploy it:

```bash
# From your project root
supabase functions deploy rag-query

# Set environment variables in Supabase
supabase secrets set PINECONE_API_KEY=your_pinecone_api_key
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

### 5. **Data Ingestion**

#### Prepare Your Mining Reports

1. **Create Data Directory**:
   ```bash
   mkdir -p data/mining-reports
   ```

2. **Add Mining Reports**: 
   - Supported formats: `.txt`, `.md`, `.json`
   - Convert PDFs to text using tools like `pdftotext` or online converters
   - Ensure files contain actual mining report content (JORC, NI 43-101, etc.)

#### Run the Ingestion Script

```bash
# Install additional dependencies for the ingestion script
npm install compromise dotenv

# Test the ingestion (dry run)
node scripts/ingest-mining-reports.js --dry-run

# Actual ingestion
node scripts/ingest-mining-reports.js

# With custom parameters
node scripts/ingest-mining-reports.js \
  --data-dir ./data/mining-reports \
  --chunk-size 2000 \
  --clean
```

**Script Options**:
- `--data-dir`: Directory containing mining reports (default: `./data/mining-reports`)
- `--chunk-size`: Text chunk size for embeddings (default: 2000)
- `--clean`: Clean existing data before ingestion
- `--dry-run`: Test without actually uploading data

## 🎯 Usage Guide

### **Accessing AI Features**

1. **Open Report Editor**: Navigate to any report in ReportForge
2. **AI Button**: Click the ✨ AI Assist button in the floating menu
3. **Select Text** (optional): Highlight text you want to enhance
4. **Choose Prompt**: Select from organized prompt categories

### **RAG-Powered Expansion**

1. **Select Text**: Highlight content you want to expand
2. **Open AI Panel**: Click AI Assist button
3. **Choose "🔍 Expand using RAG"**: This uses your mining report database
4. **Review Results**: AI provides context-aware expansion using similar projects
5. **Insert/Replace**: Choose how to apply the generated content

### **AI Prompt Categories**

#### 🔧 **Mining Report Enhancement**
- **🔍 Expand using RAG**: Use mining report database for context
- **✨ Improve technical writing**: Enhance clarity and industry standards
- **🔧 Add technical detail**: Include relevant technical information
- **📊 Add quantitative analysis**: Enhance with data and statistics
- **⚖️ Ensure regulatory compliance**: Check JORC/NI 43-101 compliance

#### 📝 **Content Generation**
- **📝 Generate section content**: Create content for any JORC/NI 43-101 section
- **📋 Create methodology**: Detailed procedure descriptions
- **⚠️ Add risk assessment**: Comprehensive risk analysis
- **💰 Economic analysis**: Financial projections and viability

#### 🔄 **Content Modification**
- **🔄 Simplify for executives**: Executive-friendly summaries
- **📏 Adjust length**: Make concise or expand with detail
- **🎯 Change technical style**: Professional, investor-focused, regulatory
- **🌐 Translate**: Multiple language support

#### ✅ **Quality Assurance**
- **✅ Review for accuracy**: Technical accuracy verification
- **📖 Check terminology**: Mining industry standard terms
- **🔍 Fact verification**: Verify against industry standards
- **📐 Units and calculations**: Verify measurements and calculations

### **AI Response Actions**

When AI generates content, you have several options:

- **📋 Copy**: Copy to clipboard
- **➕ Insert**: Add as new paragraph
- **🔄 Replace**: Replace selected text
- **🔄 Regenerate**: Generate alternative response

## 🔍 Troubleshooting

### **Common Issues**

#### RAG Queries Failing
```
Error: RAG query failed: Pinecone query failed
```
**Solutions**:
- Check Pinecone API key and index name
- Verify index has been created with correct dimensions (1536)
- Ensure you have ingested data into the index

#### No AI Responses
```
Error: AI request failed: OpenAI API Error
```
**Solutions**:
- Verify OpenAI API key is valid
- Check OpenAI account has sufficient credits
- Ensure Supabase Edge Functions have environment variables set

#### Ingestion Script Errors
```
Error: Missing required environment variables
```
**Solutions**:
- Ensure `.env` file has `PINECONE_API_KEY` and `OPENAI_API_KEY`
- Run `npm install` to install required packages
- Check file formats are supported (.txt, .md, .json)

### **Testing the Integration**

1. **Test Basic AI**: 
   - Open report editor
   - Select some text
   - Use "Improve technical writing" prompt
   - Should receive enhanced content

2. **Test RAG Pipeline**:
   - Ensure you have mining reports in Pinecone
   - Select mining-related text
   - Use "🔍 Expand using RAG"
   - Should receive context-aware expansion

3. **Check Data Ingestion**:
   ```bash
   # Verify data was ingested
   node scripts/ingest-mining-reports.js --dry-run
   # Should show existing files and chunks
   ```

## 📊 Performance Optimization

### **Pinecone Index Optimization**
- Use appropriate regions for better latency
- Consider paid plans for better performance
- Monitor usage and costs

### **OpenAI API Optimization**
- Use appropriate models (gpt-4o-mini for cost efficiency)
- Implement rate limiting for high-volume usage
- Cache embeddings when possible

### **Supabase Edge Functions**
- Monitor function execution times
- Consider increasing timeout for large requests
- Use appropriate pricing plan

## 🚀 Next Steps

1. **Add More Data**: Continuously add mining reports to improve RAG quality
2. **Custom Prompts**: Extend `src/lib/aiPrompts.ts` with company-specific prompts
3. **Fine-tuning**: Consider fine-tuning models on your specific domain
4. **Analytics**: Track AI usage and user feedback
5. **Collaboration**: Enable AI features for all team members

## 📚 Additional Resources

- [Pinecone Documentation](https://docs.pinecone.io/)
- [OpenAI API Reference](https://platform.openai.com/docs/api-reference)
- [JORC Code](https://www.jorc.org/)
- [NI 43-101 Standards](https://www.cim.org/en/advocacy/best-practices/national-instrument-43-101-standards-of-disclosure-for-mineral-projects)

## 🔒 Security Considerations

- **API Keys**: Keep all API keys secure and never commit to version control
- **Data Anonymization**: The system automatically anonymizes company names and personnel
- **Access Control**: RAG data is accessible to all authenticated users
- **Compliance**: Ensure data usage complies with your organization's policies

---

🎉 **Congratulations!** You now have a powerful AI and RAG system integrated into ReportForge, providing context-aware assistance for mining report generation based on industry best practices. 