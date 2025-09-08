# 🚀 ReportForge Setup Guide

This guide will help you get ReportForge running with all AI features enabled.

## 📋 Quick Start

### 1. **Clone and Install**
```bash
git clone <repository-url>
cd reportforge
npm install
```

### 2. **Create Environment File**
```bash
# Create .env file from template
cp .env.example .env
```

### 3. **Configure Required API Keys**
Edit your `.env` file with the following **REQUIRED** keys:

```env
# REQUIRED: OpenAI API Key (for all AI features)
VITE_OPENAI_API_KEY=sk-proj-your_key_here
OPENAI_API_KEY=sk-proj-your_key_here

# REQUIRED: Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# REQUIRED: Liveblocks (for collaboration)
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_your_key_here
```

### 4. **Start Development Server**
```bash
npm run dev
```

## 🔑 Getting API Keys

### **OpenAI API Key** (REQUIRED)
1. Go to [platform.openai.com](https://platform.openai.com)
2. Sign up/login
3. Go to **API Keys** section
4. Create new secret key (starts with `sk-proj-`)
5. Add credits to your account for usage

**Cost**: ~$0.01-0.10 per AI request depending on usage

### **Supabase Setup** (REQUIRED)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Go to **Settings** → **API**
4. Copy **Project URL** and **anon public** key

### **Liveblocks Setup** (REQUIRED)
1. Go to [liveblocks.io](https://liveblocks.io)
2. Create account and project
3. Go to **Settings** → **API Keys**
4. Copy **Public Key** (starts with `pk_dev_`)

### **Pinecone Setup** (OPTIONAL - for Enhanced RAG)
1. Go to [pinecone.io](https://pinecone.io)
2. Create account and project
3. Create index named `reportforge-mining-data`:
   - **Dimensions**: 1536
   - **Metric**: cosine
4. Copy API key (starts with `pcsk_`)

```env
# Add to .env if you want RAG features
PINECONE_API_KEY=pcsk_your_key_here
VITE_PINECONE_API_KEY=pcsk_your_key_here
```

## 🎯 Feature Availability

| Feature | Required Keys | Status Without Keys |
|---------|---------------|-------------------|
| **Basic App** | Supabase + Liveblocks | ✅ Fully Functional |
| **Report Editor** | Supabase + Liveblocks | ✅ Fully Functional |
| **Collaboration** | Supabase + Liveblocks | ✅ Fully Functional |
| **AI Features** | + OpenAI | ❌ All AI features fail |
| **Enhanced RAG** | + OpenAI + Pinecone | ❌ Falls back to standard AI |

## 🤖 AI Features Overview

With OpenAI API key configured, you get **40+ AI features**:

### **Mining Report Enhancement**
- 🔍 **Expand using Enhanced RAG** (needs Pinecone)
- ✨ Improve technical writing
- 🔧 Add technical detail
- 📊 Add quantitative analysis
- ⚖️ Ensure regulatory compliance

### **Content Generation**
- 📝 Generate content for 27 mining report sections
- 🔬 Create methodology sections
- ⚠️ Add risk assessments
- 💰 Economic analysis

### **Content Modification**
- 👔 Simplify for executives
- 📏 Adjust length (concise/detailed/summary)
- 🎨 Change technical style (6 styles)
- 🌐 **Translate** (6 languages)

### **Quality Assurance**
- ✅ Review for accuracy
- 📖 Check terminology
- 🔍 Fact verification
- 🧮 Units and calculations

## 🚨 Troubleshooting

### **"All AI features fail"**
- ✅ Check `VITE_OPENAI_API_KEY` and `OPENAI_API_KEY` in `.env`
- ✅ Verify OpenAI account has credits
- ✅ Restart dev server after adding keys

### **"RAG features don't work"**
- ✅ Add Pinecone API keys to `.env`
- ✅ Create Pinecone index named `reportforge-mining-data`
- ℹ️ Standard AI features will still work without Pinecone

### **"Collaboration doesn't work"**
- ✅ Check Liveblocks public key in `.env`
- ✅ Verify Supabase configuration

### **"App doesn't load"**
- ✅ Check Supabase URL and anon key
- ✅ Run `npm install` to ensure all dependencies
- ✅ Check browser console for specific errors

## 📂 Complete .env Template

Create `.env` file with:

```env
# REQUIRED: OpenAI (for AI features)
VITE_OPENAI_API_KEY=sk-proj-your_openai_key_here
OPENAI_API_KEY=sk-proj-your_openai_key_here

# REQUIRED: Supabase (for app functionality)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# REQUIRED: Liveblocks (for collaboration)
VITE_LIVEBLOCKS_PUBLIC_KEY=pk_dev_your_liveblocks_key_here

# OPTIONAL: Pinecone (for enhanced RAG features)
PINECONE_API_KEY=pcsk_your_pinecone_key_here
VITE_PINECONE_API_KEY=pcsk_your_pinecone_key_here
PINECONE_INDEX=reportforge-mining-data

# OPTIONAL: Server configuration
API_PORT=3001
```

## 🎉 Success!

Once configured, you should see:
- ✅ App loads at `http://localhost:3000`
- ✅ Can create and edit reports
- ✅ Collaboration features work
- ✅ AI button (🤖) provides 40+ AI features
- ✅ All translations, improvements, and content generation work

**Need help?** Check the detailed guides:
- `AI_RAG_SETUP.md` - Detailed AI setup
- `LIVEBLOCKS_TOKEN_SETUP.md` - Collaboration setup
- `RAG_ENVIRONMENT_SETUP.md` - RAG features
