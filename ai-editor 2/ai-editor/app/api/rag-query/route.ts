import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import nlp from "compromise";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
const pineconeIndex = pinecone.index("report-forge-data");
console.log("✅ RAG route hit");
// Step 1: Anonymize real names/locations from historical text
function anonymizeText(text: string): string {
  const doc = nlp(text);
  doc.people().replaceWith("[Qualified Person]");
  doc.organizations().replaceWith("[Company]");
  doc.places().replaceWith("[Location]");
  return doc.text();
}

// Step 2: Replace placeholders with user-provided values
function fillPlaceholders(text: string, userInputs: Record<string, string[]>): string {
  let result = text;
  for (const [key, values] of Object.entries(userInputs)) {
    const placeholder = `[${key}]`;
    const replacement = values.join(", ");
    result = result.replaceAll(placeholder, replacement);
  }
  return result;
}

export async function POST(req: NextRequest) {
  const { query, section, topK = 7, userInputs = {} } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
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
    filter: section ? { section: { $eq: section } } : undefined,
  });

  const rawChunks = (results.matches || [])
    .map((match: any) => ({
      text: match.metadata?.text || "",
      section: match.metadata?.section || "Unknown",
    }))
    .filter((chunk) => chunk.text);
  console.log(`Found ${rawChunks.length} relevant chunks for query: "${query}"`);
  if (rawChunks.length === 0) {
    return NextResponse.json({ error: "No relevant context found." }, { status: 404 });
  }

  // Step 5: Anonymize all retrieved chunks
  const anonymizedChunks = rawChunks.map((c) => anonymizeText(c.text));
  const contextText = anonymizedChunks.join("\n---\n");

  // Step 6: Compose the RAG prompt
  const systemPrompt = `
You are an AI assistant helping write a mining technical reports (JORC And NI 43-101). Your job is to expand a section or subsection using information from multiple reports.
Use only the context below. Generalize across different documents. 

- Anonymize all real-world data such as:
  - People’s names → {{PersonName}}
  - Organizations → {{CompanyName}}
  - Locations and coordinates → {{Location}}, {{Latitude}}, {{Longitude}}
  - Minerals → {{MineralType}}
  - Dates → {{Dates}}
  - Years → {{Year}}
  - Amounts → {{Amount}}
  - Percentages → {{Percentage}}
  - Places → {{Location}}

- If the user provides values for any of these placeholders, use them in place of the placeholders but only in relevant places  .
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
    model: "gpt-4o-mini-2024-07-18",
    messages: [
      { role: "system", content: "You are a helpful assistant that generates mining report sections for JORC And NI 43-101 reports." },
      { role: "user", content: systemPrompt },
    ],
    max_tokens: 512,
    temperature: 0.2,
  });

  let answer = completion.choices[0].message.content || "";

  // Step 8: Fill placeholders with provided values
  // if (Object.keys(userInputs).length > 0) {
  //   answer = fillPlaceholders(answer, userInputs);
  // }

  return NextResponse.json({
    answer,
    context: anonymizedChunks,
    section: section || null,
    filled: Object.keys(userInputs).length > 0,
  });
}