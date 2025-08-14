import fs from "fs";
import path from "path";
import { Pinecone } from "@pinecone-database/pinecone";
import OpenAI from "openai";
import "dotenv/config";

const DATA_DIR = path.join(__dirname, "../data");
const PINECONE_INDEX = "report-forge-data"; // Set your Pinecone index name
const PINECONE_API_KEY = "pcsk_3Ar6Ud_5teeWEJhuKTTLYpnDgWVN48S2LN3piatfD25rZ43LAfTN7d178JdwLTKaoTctfU";
const OPENAI_API_KEY = "";

const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });
let pineconeIndex: Awaited<ReturnType<typeof pinecone.index>>;

// Helper: Split markdown into chunks (e.g., by paragraphs)
function chunkMarkdown(text: string, chunkSize = 2000): string[] {
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";
  for (const para of paragraphs) {
    // If paragraph itself is too big, split it further
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
      continue;
    }
    if ((current.length + para.length) > chunkSize) {
      if (current) chunks.push(current);
      current = para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

async function embedText(text: string): Promise<number[]> {
  const res = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: text,
  });
  return res.data[0].embedding;
}
async function main() {
  pineconeIndex = pinecone.index(PINECONE_INDEX);
  const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith(".md"));
  for (const file of files) {
    const filePath = path.join(DATA_DIR, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const chunks = chunkMarkdown(content);
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = await embedText(chunk);
      await pineconeIndex.upsert([
        {
          id: `${file}-${i}`,
          values: embedding,
          metadata: { file, chunkIndex: i, text: chunk },
        }
      ]);
      console.log(`Upserted chunk ${i} from ${file}`);
    }
  }
}


main().catch(console.error);
