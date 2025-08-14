import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "fs";
import path from "path";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";

const DATA_DIR = path.join(__dirname, "../data/json_sample");
const PINECONE_INDEX = "report-forge-data";

const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });
let pineconeIndex: Awaited<ReturnType<typeof pinecone.index>>;

// Detect if a section should be skipped based on known phrases
function isSkippable(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("not relevant") ||
    lower.includes("not applicable") ||
    lower.includes("no material information") ||
    lower.includes("not provided") ||
    lower.includes("this section is intentionally left blank")
  );
}

// Optional: further chunking if section is too large
function chunkText(text: string, chunkSize = 2000): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (para.length > chunkSize) {
      for (let i = 0; i < para.length; i += chunkSize) {
        const part = para.slice(i, i + chunkSize);
        if (current.length + part.length > chunkSize) {
          if (current) chunks.push(current);
          current = part;
        } else {
          current += (current ? "\n\n" : "") + part;
        }
      }
    } else {
      if (current.length + para.length > chunkSize) {
        if (current) chunks.push(current);
        current = para;
      } else {
        current += (current ? "\n\n" : "") + para;
      }
    }
  }

  if (current) chunks.push(current);
  return chunks;
}

async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return res.data[0].embedding;
}

async function main() {
  pineconeIndex = pinecone.index(PINECONE_INDEX);
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".json"));
  console.log(`Found ${files.length} JSON files in ${DATA_DIR}`);

  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const sections = JSON.parse(fs.readFileSync(filePath, "utf-8"));

    for (const section of sections) {
      const sectionId = section.id;
      const sectionTitle = section.title;
      const rawText = section.text || "";

      console.log(`Section title: ${sectionTitle}`);
      const skip = isSkippable(rawText);
      console.log(`Is skippable: ${skip}`);
      if (skip) continue;

      const chunks = chunkText(rawText);
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const embedding = await embedText(chunk);

        await pineconeIndex.upsert([
          {
            id: `${file}-${sectionId}-${i}`,
            values: embedding,
            metadata: {
              file,
              section: sectionTitle,
              chunkIndex: i,
              text: chunk,
            },
          },
        ]);

        console.log(`Upserted: ${file} → Section: ${sectionTitle} → Chunk ${i}`);
      }
    }
  }
}

main().catch((err) => {
  console.error("Script failed:", err);
});
