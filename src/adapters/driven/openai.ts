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
    recommendedTemplate: string;
    acknowledgment: string;
    analysisResponse: string;
    fullAnswer: string;
  }> {
    const prompt = `
      ROLE: Senior Technical Support Expert at MindX.
      AGENT NAME: ${agentName}

      TASK: Provide a professional Vietnamese response using WIKI templates and chọc (access) Odoo data.
      IMPORTANT: Return the output as a valid JSON object.

      [WIKI DATA]:
      ${wikiContext}

      [TICKET & ODOO DATA]:
      Title: ${ticket.title}
      Details: ${ticket.description}

      REPLY REQUIREMENTS (STRICT):
      1. acknowledgment: Use Wiki 5.1 Template. Replace [Name] with "${agentName}". 
      2. analysisResponse: 
         - Must explain WHY the error happened based on Resolved Logs or Policies.
         - If Odoo Data shows issues (e.g., unpaid), mention it.
         - Professional tone. No "nhà mình", "mình", "em".
      3. fullAnswer: Combine exactly: [acknowledgment] + [analysisResponse] + "Trân Trọng,\\nMindX Support Team".

      JSON OUTPUT:
      {
        "category": "...",
        "wikiSection": "...",
        "priority": "...",
        "priorityReason": "...",
        "diagnosis": "...",
        "recommendedTemplate": "...",
        "acknowledgment": "...",
        "analysisResponse": "...",
        "fullAnswer": "..."
      }
    `;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        response_format: { type: "json_object" },
      });

      const choice = completion.choices[0];
      if (!choice || !choice.message?.content) throw new Error("AI returned empty content.");
      return JSON.parse(choice.message.content);
    } catch (error: any) {
      const fallback = "Lỗi kết nối AI.";
      return { 
        category: "Error", wikiSection: "2", priority: "N/A", priorityReason: "Error",
        diagnosis: error.message, recommendedTemplate: "no-problem.html", 
        acknowledgment: fallback, analysisResponse: fallback, fullAnswer: fallback 
      };
    }
  }
}
