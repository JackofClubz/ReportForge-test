import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from '../_shared/cors.ts';

// Note: You'll need to add these environment variables to your Supabase project
const PINECONE_API_KEY = Deno.env.get('PINECONE_API_KEY');
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
const PINECONE_INDEX = "reportforge-mining-data";

// Enhanced section detection from ai-editor 2
function detectSection(text: string): string | undefined {
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

// Enhanced placeholder replacement system
function fillPlaceholders(text: string, userInputs: Record<string, string[]>): string {
  let result = text;
  
  // Default values if none provided
  const defaults: Record<string, string> = {
    'Qualified Person': 'the qualified person',
    'Company': 'the company',
    'Location': 'the project location',
    'Project Name': 'the project',
    'Mine Name': 'the mine'
  };
  
  for (const [key, values] of Object.entries(userInputs)) {
    const placeholder = `[${key}]`;
    const replacement = values.length > 0 ? values.join(", ") : defaults[key] || `[${key}]`;
    result = result.replaceAll(placeholder, replacement);
  }
  
  return result;
}

// Extract user inputs from text for personalization
function extractUserInputs(text: string): Record<string, string[]> {
  const userInputs: Record<string, string[]> = {};

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

  // Extract locations (basic patterns)
  const locationMatches = text.match(/(?:located|situated|in|at)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,?\s*[A-Z][a-z]+)/gi);
  if (locationMatches) {
    userInputs["Location"] = locationMatches.map(loc => 
      loc.replace(/(?:located|situated|in|at)\s+/i, "").trim()
    );
  }

  return userInputs;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!PINECONE_API_KEY || !OPENAI_API_KEY) {
      throw new Error('Missing required environment variables: PINECONE_API_KEY, OPENAI_API_KEY');
    }

    const { query, topK = 5, section, userInputs = {} } = await req.json();
    if (!query) {
      return new Response(JSON.stringify({ error: "Missing query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[RAG] Processing query: ${query.substring(0, 100)}...`);
    
    // Auto-detect section if not provided
    const detectedSection = section || detectSection(query);
    if (detectedSection) {
      console.log(`[RAG] Detected section: ${detectedSection}`);
    }

    // Extract user inputs for personalization
    const extractedInputs = extractUserInputs(query);
    const finalUserInputs = { ...extractedInputs, ...userInputs };
    console.log(`[RAG] User inputs extracted:`, Object.keys(finalUserInputs));

    // 1. Create embedding for the query using OpenAI (upgraded model)
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small', // Upgraded from ada-002
        input: query,
      }),
    });

    if (!embeddingResponse.ok) {
      throw new Error(`OpenAI embedding failed: ${embeddingResponse.statusText}`);
    }

    const embeddingData = await embeddingResponse.json();
    const queryEmbedding = embeddingData.data[0].embedding;

    // 2. Query Pinecone for similar chunks (with optional section filtering)
    const pineconeBody: any = {
      topK,
      vector: queryEmbedding,
      includeMetadata: true,
      namespace: 'mining-reports',
    };

    // Add section filter if detected/provided
    if (detectedSection) {
      pineconeBody.filter = { section: { $eq: detectedSection } };
    }

    const pineconeResponse = await fetch(`https://${PINECONE_INDEX}.svc.apw5-4e34-81fa.pinecone.io/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': PINECONE_API_KEY,
      },
      body: JSON.stringify(pineconeBody),
    });

    if (!pineconeResponse.ok) {
      throw new Error(`Pinecone query failed: ${pineconeResponse.statusText}`);
    }

    const pineconeData = await pineconeResponse.json();
    
    // 3. Extract and anonymize context from top matches
    const contexts = (pineconeData.matches || [])
      .map((match: any) => anonymizeText(match.metadata?.text || ""))
      .filter(Boolean);

    console.log(`[RAG] Found ${contexts.length} relevant contexts`);

    // 4. Apply placeholder replacement to retrieved context
    const personalizedContexts = contexts.map(context => 
      fillPlaceholders(context, finalUserInputs)
    );

    // 5. Generate contextual response using retrieved data
    const contextText = personalizedContexts.join("\n---\n");
    const prompt = `
You are a professional mining report assistant with expertise in JORC Code and NI 43-101 standards.

Use the following context from historical mining reports to expand and enhance the selected text. 
${detectedSection ? `Focus on the "${detectedSection}" section requirements.` : ''}
All content has been personalized based on the user's project details.

Context from mining reports:
${contextText}

Selected text to expand: ${query}

Provide an enhanced, professional expansion that:
- Uses technical terminology appropriately
- Follows industry standards and best practices
- Integrates relevant context from historical reports
- Maintains the original intent while adding valuable detail
${detectedSection ? `- Adheres to ${detectedSection} section requirements` : ''}

Enhanced content:
`;

    // 6. Get enhanced content from OpenAI
    const completionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { 
            role: 'system', 
            content: 'You are a professional mining report assistant. Provide enhanced content based on historical mining report context.' 
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
        temperature: 0.2,
      }),
    });

    if (!completionResponse.ok) {
      throw new Error(`OpenAI completion failed: ${completionResponse.statusText}`);
    }

    const completionData = await completionResponse.json();
    const answer = completionData.choices[0].message.content;

    console.log(`[RAG] Generated response length: ${answer?.length || 0} characters`);

    return new Response(JSON.stringify({ 
      success: true,
      answer, 
      context: personalizedContexts.slice(0, 3), // Return top 3 contexts for reference
      section: detectedSection,
      userInputs: finalUserInputs,
      sources: pineconeData.matches?.slice(0, 3).map((match: any) => ({
        file: match.metadata?.file || 'Unknown',
        score: match.score || 0,
        section: match.metadata?.section || 'Unknown',
      })) || []
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('[RAG] Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

/**
 * Enhanced anonymize sensitive information in mining report text
 */
function anonymizeText(text: string): string {
  if (!text) return '';
  
  // Enhanced anonymization patterns from ai-editor 2
  let anonymized = text
    // Company names (improved patterns)
    .replace(/\b[A-Z][a-z]+ (?:Resources?|Mining|Corporation|Corp\.?|Ltd\.?|Inc\.?|Limited|Company|Co\.?)\b/g, '[Company]')
    .replace(/\b[A-Z][a-z]+ (?:Gold|Silver|Copper|Iron|Diamond|Coal|Uranium|Potash) (?:Mine|Project|Property|Deposit)\b/g, '[Project Name]')
    // Person names (improved detection)
    .replace(/\b[A-Z][a-z]+ [A-Z][a-z]+(?:, P\.Geo\.?|, Ph\.D\.?|, M\.Sc\.?|, B\.Sc\.?|, FAusIMM|, P\.Eng\.?)?\b/g, '[Qualified Person]')
    // Locations (expanded patterns)
    .replace(/\b(?:British Columbia|Ontario|Quebec|Alberta|Saskatchewan|Manitoba|Nevada|Arizona|Peru|Chile|Australia|Ghana|South Africa|Botswana|Angola|Russia)\b/g, '[Location]')
    // Specific mine/project names (enhanced)
    .replace(/\b[A-Z][a-z]+ (?:Mine|Project|Property|Deposit|Zone|Pit|Open Pit|Underground)\b/g, '[Project Name]')
    // Numbers that might be sensitive (optional)
    .replace(/\b\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:carats?|grams?|tonnes?|meters?|km)\b/g, '[Quantity]');

  return anonymized;
} 