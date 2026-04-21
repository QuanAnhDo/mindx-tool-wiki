import OpenAI from "openai";
import { AIResponseGenerator } from "../../application/ports/ai-generator.port";

export class OpenAIAdapter implements AIResponseGenerator {
  private client: OpenAI;
  private model: string;

  constructor() {
    const apiKey = process.env.AI_API_KEY || "";
    const baseURL = process.env.AI_BASE_URL || "https://api.groq.com/openai/v1";
    this.model = process.env.AI_MODEL_NAME || "llama-3.3-70b-versatile";
    this.client = new OpenAI({ apiKey, baseURL });
  }

  async generateFullResponse(
    ticket: { title: string; description: string },
    wikiContext: string,
    agentName: string = "Tech Team"
  ): Promise<{
    category: string;
    wikiSection: string;
    priority: string;
    priorityReason: string;
    diagnosis: string;
    isSolutionFound: boolean;
    recommendedTemplate: string;
    acknowledgment: string;
    analysisResponse: string;
    fullAnswer: string;
  }> {
    if (!process.env.AI_API_KEY) {
      const err = "ERROR: Missing API_KEY";
      return { 
        category: "N/A", wikiSection: "N/A", priority: "N/A", priorityReason: "N/A",
        diagnosis: "N/A", isSolutionFound: false, recommendedTemplate: "no-problem.html",
        acknowledgment: err, analysisResponse: err, fullAnswer: err
      };
    }

    const prompt = `
      ROLE: Senior Technical Support Expert at MindX.
      TASK: Match the ticket with existing Wiki solutions (QUERY). 

      [WIKI DATA]:
      ${wikiContext}

      [TICKET]:
      Title: ${ticket.title}
      Description: ${ticket.description}

      STRICT DECISION RULES:
      1. isSolutionFound: 
         - Set to TRUE ONLY if you find a specific resolution for THIS EXACT PROBLEM in "Section 8 (Resolved Tickets)" or "Section 7 (Known Issues)". 
         - Set to FALSE if the ticket describes a new issue or if the Wiki only contains general policies without a fix.
      
      2. RESPONSE STRUCTURE (VIETNAMESE):
         - IF RESOLVED (true): acknowledgment (Wiki 5.1) + The Solution (Wiki 5.3) + Signature.
         - IF PENDING (false): acknowledgment (Wiki 5.1) + "Vấn đề này hiện chưa có trong quy trình xử lý tự động. Tech Team đang tiến hành rà soát kỹ thuật và sẽ phản hồi giải pháp cho bạn sớm nhất (trong vòng 24h)." + Signature.

      STRICT STYLE RULES:
      - Always start with "Dear BU,".
      - Use "Tech Team" for yourself.
      - NO informal terms like "nhà mình", "mình", "em".
      - NO [ ] placeholders.

      OUTPUT FORMAT (JSON ONLY):
      {
        "category": "...",
        "wikiSection": "...",
        "priority": "Standard | Priority | Expedite",
        "priorityReason": "Explain based on user impact (<5, 5-25, >25)",
        "diagnosis": "Technical analysis of the issue",
        "isSolutionFound": true | false,
        "recommendedTemplate": "...",
        "acknowledgment": "Standard greeting from Wiki 5.1",
        "analysisResponse": "The solution part OR the pending notification",
        "fullAnswer": "Full professional message"
      }
    `;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        response_format: { type: "json_object" },
      });

      const choice = completion.choices[0];
      if (!choice || !choice.message?.content) throw new Error("AI failed");
      return JSON.parse(choice.message.content);
    } catch (error: any) {
      const fallback = "Lỗi kết nối AI.";
      return { 
        category: "Error", wikiSection: "2", priority: "N/A", priorityReason: "Error",
        diagnosis: error.message, isSolutionFound: false, recommendedTemplate: "no-problem.html", 
        acknowledgment: fallback, analysisResponse: fallback, fullAnswer: fallback 
      };
    }
  }
}
