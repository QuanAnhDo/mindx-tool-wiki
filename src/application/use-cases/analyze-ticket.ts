import { KnowledgeSearchPort, KnowledgeHit } from "../ports/knowledge-search.port";
import { AIResponseGenerator } from "../ports/ai-generator.port";

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
  response: string;
  usedContext: string[];
};

export async function analyzeTicket(
  input: AnalyzeTicketInput,
  knowledgeSearch: KnowledgeSearchPort,
  aiGenerator: AIResponseGenerator
): Promise<AnalyzeTicketOutput> {
  const query = `${input.title} ${input.description}`.trim();
  
  const [ruleHits, generalHits, solutionHits, templateHits] = await Promise.all([
    knowledgeSearch.search("SLA Priority quy định phân loại ticket quy chuẩn Service Tiers", 3),
    knowledgeSearch.search(query, 5),
    knowledgeSearch.search(`${input.title} cách giải quyết lịch sử resolved`, 5),
    knowledgeSearch.search(`${input.title} response template mẫu phản hồi`, 5)
  ]);

  const allHits = [...ruleHits, ...generalHits, ...solutionHits, ...templateHits];
  const uniqueHits = Array.from(new Set(allHits.map(h => h.filePath)))
    .map(path => allHits.find(h => h.filePath === path)) as KnowledgeHit[];

  const wikiContextFullText = uniqueHits
    .map(h => `[NGUỒN: ${h.filePath}]\n${h.snippet}`)
    .join("\n\n---\n\n");

  const aiResult = await aiGenerator.generateFullResponse(input, wikiContextFullText);

  return {
    query,
    category: aiResult.category,
    wikiSection: aiResult.wikiSection,
    priority: aiResult.priority,
    priorityReason: aiResult.priorityReason,
    diagnosis: aiResult.diagnosis,
    response: aiResult.answer,
    usedContext: uniqueHits.slice(0, 10).map(h => h.filePath),
  };
}
