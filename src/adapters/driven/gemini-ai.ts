import { GoogleGenerativeAI } from "@google/generative-ai";
import { AIResponseGenerator } from "../../application/ports/ai-generator.port";

export class GeminiAIAdapter implements AIResponseGenerator {
  private getModel() {
    const key = process.env.GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "your_gemini_api_key_here") {
      const err = "LỖI: Chưa cấu hình API Key";
      return { 
        category: "N/A", wikiSection: "N/A", priority: "N/A", priorityReason: "N/A",
        diagnosis: "N/A", recommendedTemplate: "no-problem.html",
        acknowledgment: err, analysisResponse: err, fullAnswer: err
      };
    }

    const model = this.getModel();
    const prompt = `
      Nhiệm vụ: Phân tích ticket và viết phản hồi 2 phần bằng Tiếng Việt.
      Agent Name: ${agentName}

      Dữ liệu Wiki: ${wikiContext}
      Ticket: ${ticket.title} - ${ticket.description}

      Yêu cầu:
      1. acknowledgment: Lời chào (Mẫu Wiki 5.1), thay tên bằng ${agentName}.
      2. analysisResponse: Chẩn đoán kỹ thuật và giải pháp.
      3. fullAnswer: Gộp 1 + 2 + "Trân Trọng,\\nMindX Support Team".

      TRẢ VỀ JSON:
      {
        "category": "...", "wikiSection": "...", "priority": "...", "priorityReason": "...",
        "diagnosis": "...", "recommendedTemplate": "...", "acknowledgment": "...",
        "analysisResponse": "...", "fullAnswer": "..."
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return JSON.parse(text);
    } catch (error: any) {
      const fallback = "Lỗi kết nối AI.";
      return { 
        category: "Error", wikiSection: "2", priority: "N/A", priorityReason: "Error",
        diagnosis: "Error", recommendedTemplate: "no-problem.html", 
        acknowledgment: fallback, analysisResponse: fallback, fullAnswer: fallback 
      };
    }
  }
}
