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

  async generateFullResponse(ticket: { title: string; description: string }, wikiContext: string): Promise<{
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
      const err = "ERROR: Missing AI_API_KEY";
      return { 
        category: "N/A", wikiSection: "N/A", priority: "N/A", priorityReason: "N/A",
        diagnosis: "N/A", isSolutionFound: false, recommendedTemplate: "no-problem.html",
        acknowledgment: err, analysisResponse: err, fullAnswer: err
      };
    }

    const prompt = `
      ROLE: Senior Technical Support at MindX.
      TASK: Extract and populate Wiki templates while strictly enforcing professional persona.

      [WIKI CONTEXT]:
      ${wikiContext}

      [TICKET]:
      Title: ${ticket.title}
      Description: ${ticket.description}

      STRICT PERSONA & LANGUAGE RULES:
      - FORBIDDEN WORDS: Never use "nhà mình", "mình", "em", "anh", "chị", "quando".
      - MANDATORY TERMS: Use "Tech Team" or "Team" for yourself. Use "BU" or "Bạn" for the requester.
      - If the Wiki template contains a forbidden word, you MUST replace it with a professional alternative.
      - LANGUAGE: Strictly VIETNAMESE.

      OUTPUT INSTRUCTIONS:
      1. acknowledgment: Fill the template from Wiki 5.1. Replace [Name] with "Tech Team". Replace any informal terms found in the template.
      2. analysisResponse: Provide technical diagnosis.
      3. fullAnswer: Combined message.

      RETURN JSON:
      {
        "category": "...",
        "wikiSection": "...",
        "priority": "...",
        "priorityReason": "...",
        "diagnosis": "...",
        "isSolutionFound": true/false,
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
      if (!choice || !choice.message?.content) throw new Error("Empty response");
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
