import { KnowledgeSearchPort, KnowledgeHit } from "../ports/knowledge-search.port";
import { AIResponseGenerator } from "../ports/ai-generator.port";
import fs from "node:fs/promises";
import path from "node:path";

type AnalyzeTicketInput = {
  title: string;
  description: string;
  agentName?: string;
};

type AnalyzeTicketOutput = {
  query: string;
  category: string;
  wikiSection: string;
  priority: string;
  priorityReason: string;
  diagnosis: string;
  recommendedTemplate: string;
  acknowledgment: string;
  analysisResponse: string;
  response: string;
  usedContext: string[];
};

export async function analyzeTicket(
  input: AnalyzeTicketInput,
  knowledgeSearch: KnowledgeSearchPort,
  aiGenerator: AIResponseGenerator
): Promise<AnalyzeTicketOutput> {
  const query = `${input.title} ${input.description}`.trim();
  
  const templatePath = path.join(process.cwd(), "templates", ".template-description.json");
  let templateContext = "";
  try {
    const templateData = await fs.readFile(templatePath, "utf8");
    templateContext = `[EMAIL TEMPLATES]:\n${templateData}`;
  } catch (e) {
    templateContext = "No email templates found.";
  }

  // 1. Tìm kiếm đa luồng (Thêm quét chuyên sâu Mục 6)
  const [ruleHits, generalHits, policyHits, solutionHits, templateHits] = await Promise.all([
    knowledgeSearch.search("SLA Priority Service Tiers", 3),
    knowledgeSearch.search(input.title, 5),
    knowledgeSearch.search("Section 6 Policies Account Management", 5), // Quét mục 6
    knowledgeSearch.search(`${input.title} Resolved History`, 5),
    knowledgeSearch.search(`${input.title} Template`, 5)
  ]);

  const allHits = [...ruleHits, ...generalHits, ...policyHits, ...solutionHits, ...templateHits];
  
  // Lọc trùng theo đường dẫn file
  const uniqueHits = Array.from(new Map(allHits.map(h => [h.filePath, h])).values());

  const wikiContextFullText = `
    ${templateContext}
    ---
    ${uniqueHits.map(h => `[FILE: ${h.filePath}]\n${h.snippet}`).join("\n\n---\n\n")}
  `;

  // 2. AI phân tích
  const aiResult = await aiGenerator.generateFullResponse(input, wikiContextFullText, input.agentName);

  return {
    query,
    category: aiResult.category,
    wikiSection: aiResult.wikiSection,
    priority: aiResult.priority,
    priorityReason: aiResult.priorityReason,
    diagnosis: aiResult.diagnosis,
    recommendedTemplate: aiResult.recommendedTemplate || "no-problem.html",
    acknowledgment: aiResult.acknowledgment,
    analysisResponse: aiResult.analysisResponse,
    response: aiResult.fullAnswer,
    usedContext: uniqueHits.map(h => h.filePath).slice(0, 10),
  };
}
