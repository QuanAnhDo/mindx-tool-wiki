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
  
  // 1. Lấy mô tả Template từ file JSON local (để AI biết danh sách file)
  const templatePath = path.join(process.cwd(), "templates", ".template-description.json");
  let templateContext = "";
  try {
    const templateData = await fs.readFile(templatePath, "utf8");
    templateContext = `[EMAIL TEMPLATES AVAILABLE]:\n${templateData}`;
  } catch (e) {
    templateContext = "No email templates found.";
  }

  // 2. Chỉ truy vấn duy nhất từ Azure Wiki (Theo yêu cầu tối giản)
  const hits = await azureWikiSearch.search(input.title, 15);
  
  const wikiContextFullText = `
    ${templateContext}
    ---
    ${hits.map(h => `[SOURCE: ${h.filePath}]\n${h.snippet}`).join("\n\n---\n\n")}
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
    usedContext: hits.map(h => h.filePath).slice(0, 10),
  };
}
