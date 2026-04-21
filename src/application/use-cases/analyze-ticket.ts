import { KnowledgeSearchPort, KnowledgeHit } from "../ports/knowledge-search.port";
import { AIResponseGenerator } from "../ports/ai-generator.port";
import fs from "node:fs/promises";
import path from "node:path";

type AnalyzeTicketInput = {
  title: string;
  description: string;
};

type AnalyzeTicketOutput = {
  query: string;
  category: string;
  wikiSection: string;
  priority: string;
  priorityReason: string;
  diagnosis: string;
  isSolutionFound: boolean;
  recommendedTemplate: string;
  acknowledgment: string;
  analysisResponse: string;
  response: string;
  usedContext: string[];
};

export async function analyzeTicket(
  input: AnalyzeTicketInput,
  azureWikiSearch: KnowledgeSearchPort,
  aiGenerator: AIResponseGenerator
): Promise<AnalyzeTicketOutput> {
  const query = `${input.title} ${input.description}`.trim();
  
  // 1. Lấy mô tả Template từ file JSON local
  const templatePath = path.join(process.cwd(), "templates", ".template-description.json");
  let templateContext = "";
  try {
    const templateData = await fs.readFile(templatePath, "utf8");
    templateContext = `[EMAIL TEMPLATES AVAILABLE]:\n${templateData}`;
  } catch (e) {
    templateContext = "No email templates found.";
  }

  // 2. Tìm kiếm Wiki (Adapter mới sẽ tự động nạp SLA và ACK)
  const hits = await azureWikiSearch.search(input.title, 15);
  
  // Lọc trùng theo đường dẫn file
  const uniqueHits = Array.from(new Map(hits.map(h => [h.filePath, h])).values());

  const wikiContextFullText = `
    ${templateContext}
    ---
    ${uniqueHits.map(h => `[SOURCE: ${h.filePath}]\n${h.snippet}`).join("\n\n---\n\n")}
  `;

  // 3. AI đọc và đưa ra phản hồi
  const aiResult = await aiGenerator.generateFullResponse(input, wikiContextFullText);

  return {
    query,
    category: aiResult.category,
    wikiSection: aiResult.wikiSection,
    priority: aiResult.priority,
    priorityReason: aiResult.priorityReason,
    diagnosis: aiResult.diagnosis,
    isSolutionFound: aiResult.isSolutionFound,
    recommendedTemplate: aiResult.recommendedTemplate || "no-problem.html",
    acknowledgment: aiResult.acknowledgment,
    analysisResponse: aiResult.analysisResponse,
    response: aiResult.fullAnswer,
    usedContext: uniqueHits.map(h => h.filePath).slice(0, 10),
  };
}
