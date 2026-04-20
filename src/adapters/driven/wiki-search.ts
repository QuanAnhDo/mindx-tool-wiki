import fs from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";
import {
  KnowledgeHit,
  KnowledgeSearchPort,
} from "../../application/ports/knowledge-search.port";

export type WikiHit = KnowledgeHit;

// Lấy đường dẫn Wiki từ môi trường hoặc mặc định
const WIKI_ROOT = process.env.WIKI_PATH || "C:/Quan/Mindx-techkid/mindx-cs-wiki.wiki";

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function scoreChunk(queryTokens: string[], chunk: string): number {
  const lower = chunk.toLowerCase();
  let score = 0;
  for (const t of queryTokens) {
    if (lower.includes(t)) score += 1;
  }
  return score;
}

function chunkMarkdown(content: string, maxChars = 1200): string[] {
  const lines = content.split("\n");
  const chunks: string[] = [];
  let cur = "";

  for (const line of lines) {
    // Ưu tiên tách theo heading
    if (line.trim().startsWith("#") && cur.length > 0) {
      chunks.push(cur);
      cur = "";
    }
    if ((cur + "\n" + line).length > maxChars) {
      chunks.push(cur);
      cur = line;
    } else {
      cur += (cur ? "\n" : "") + line;
    }
  }
  if (cur.trim()) chunks.push(cur);
  return chunks;
}

export async function searchWiki(query: string, topK = 5): Promise<WikiHit[]> {
  // Đảm bảo đường dẫn chuẩn xác
  const absoluteWikiRoot = path.resolve(WIKI_ROOT);
  const files = await fg("**/*.md", { cwd: absoluteWikiRoot, absolute: true });
  const queryTokens = normalize(query);
  const hits: WikiHit[] = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(file, "utf8");
      const chunks = chunkMarkdown(content);

      for (const chunk of chunks) {
        const score = scoreChunk(queryTokens, chunk);
        if (score > 0) {
          hits.push({
            filePath: path.relative(absoluteWikiRoot, file).replace(/\\/g, "/"),
            score,
            snippet: chunk, 
          });
        }
      }
    } catch (e) {
      console.warn(`Could not read file: ${file}`);
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, topK);
}

export class WikiSearchAdapter implements KnowledgeSearchPort {
  async search(query: string, topK: number): Promise<KnowledgeHit[]> {
    return searchWiki(query, topK);
  }
}
