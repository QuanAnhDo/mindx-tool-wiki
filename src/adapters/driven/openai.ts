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
    answer: string;
  }> {
    if (!process.env.AI_API_KEY) {
      return { 
        category: "N/A", 
        wikiSection: "N/A", 
        priority: "N/A", 
        priorityReason: "N/A",
        diagnosis: "N/A",
        answer: "LỖI: Chưa cấu hình AI_API_KEY" 
      };
    }

    const prompt = `
      ROLE: You are a Senior Technical Support Expert at MindX Tech Team.
      TASK: Analyze the incoming ticket and provide a diagnostic result based on the provided Wiki Knowledge Base.

      [WIKI KNOWLEDGE BASE]:
      ${wikiContext}

      [INCOMING TICKET]:
      Title: ${ticket.title}
      Description: ${ticket.description}

      STRICT INSTRUCTIONS:
      1. PRIORITY ASSESSMENT:
         - Evaluate the number of affected users from the ticket description.
         - Map to MindX SLA Tiers: Expedite (>25 users), Priority (5-25 users), Standard (<5 users).
         - Provide the specific reasoning in the "priorityReason" field.

      2. ROOT CAUSE DIAGNOSIS:
         - Cross-reference the ticket symptoms with "Resolved Incident Logs" in the Wiki.
         - Identify the most likely cause (e.g., CRM payment allocation, ID sync issues, T+7 logic).

      3. RESPONSE GENERATION:
         - LANGUAGE: Generate the "answer" field strictly in VIETNAMESE.
         - PERSONA: Refer to yourself as "Team" or "Tech Team". Refer to the requester as "BU" or "Bạn".
         - NO PLACEHOLDERS: Do not leave any brackets [ ] or [Name]. Populate all details using real ticket data or professional deductions.

      OUTPUT FORMAT (Strict JSON only):
      {
        "category": "Classification from Wiki",
        "wikiSection": "Relevant Wiki Section Number/Name",
        "priority": "Expedite | Priority | Standard",
        "priorityReason": "Explain based on user count impact",
        "diagnosis": "Short diagnostic summary in Vietnamese",
        "answer": "The finalized professional message in Vietnamese"
      }
    `;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        response_format: { type: "json_object" },
      });

      const choice = completion.choices[0];
      if (!choice || !choice.message?.content) {
        throw new Error("AI failed to return content.");
      }

      return JSON.parse(choice.message.content);
    } catch (error: any) {
      console.error("AI Error:", error.message);
      return { 
        category: "Error", 
        wikiSection: "2", 
        priority: "N/A", 
        priorityReason: "Connection failed",
        diagnosis: "Lỗi kết nối AI",
        answer: "Lỗi kết nối AI: " + error.message 
      };
    }
  }
}
