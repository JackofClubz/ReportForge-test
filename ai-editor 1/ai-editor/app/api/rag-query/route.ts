import { NextRequest, NextResponse } from "next/server";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import "dotenv/config";
import nlp from "compromise";

const PINECONE_INDEX = "report-forge-data";
const PINECONE_API_KEY = "pcsk_3Ar6Ud_5teeWEJhuKTTLYpnDgWVN48S2LN3piatfD25rZ43LAfTN7d178JdwLTKaoTctfU";
const OPENAI_API_KEY = "";

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
const pineconeIndex = pinecone.index(PINECONE_INDEX);

function anonymizeText(text: string): string {
  const doc = nlp(text);

  doc.people().replaceWith("[Qualified Person]");
  doc.organizations().replaceWith("[Company]");
  doc.places().replaceWith("[Location]");

  return doc.text();
}

export async function POST(req: NextRequest) {
  const { query, topK = 5 } = await req.json();
  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // 1. Embed the query
  const embeddingRes = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: query,
  });
  const queryEmbedding = embeddingRes.data[0].embedding;

  // 2. Query Pinecone for similar chunks
  const results = await pineconeIndex.query({
    topK,
    vector: queryEmbedding,
    includeMetadata: true,
  });

  // 3. Collect top chunks
  const contexts = (results.matches || [])
  .map((m: any) => anonymizeText(m.metadata?.text || ""))
  .filter(Boolean);
  
  // 4. Compose prompt for OpenAI completion
  const contextText = contexts.join("\n---\n");
  const prompt = `
You are a helpful assistant that writes content for technical reports.

Use the following context from historical JORC reports to answer the question or expand the section. 
All company names, mine names, and qualified persons have already been anonymized. 
Preserve the structure and flow, but treat all placeholders like [Mine Name], [Qualified Person], etc.

Context:
${contextText}

Question: ${query}

Answer:
`;

  // 5. Get answer from OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages: [
      { role: "system", content: "You are a helpful assistant that uses provided context." },
      { role: "user", content: prompt },
    ],
    max_tokens: 512,
    temperature: 0.2,
  });

  const answer = completion.choices[0].message.content;
  return NextResponse.json({ answer, context: contexts });
}
