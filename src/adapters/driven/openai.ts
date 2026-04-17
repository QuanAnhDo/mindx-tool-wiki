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
        category: "N/A", wikiSection: "N/A", priority: "N/A", priorityReason: "N/A",
        diagnosis: "N/A", answer: "LỖI: Chưa cấu hình AI_API_KEY" 
      };
    }

    const prompt = `
      Nhiệm vụ: Bạn là chuyên gia hỗ trợ kỹ thuật tại MindX Tech Team. Hãy xử lý ticket dựa trên Wiki.

      [DỮ LIỆU TỪ WIKI]:
      ${wikiContext}

      [TICKET ĐẦU VÀO]:
      Tiêu đề: ${ticket.title}
      Mô tả: ${ticket.description}

      YÊU CẦU XỬ LÝ NGHIÊM NGẶT:
      1. ĐÁNH GIÁ PRIORITY (Bắt buộc theo số lượng user trong file SLA):
         - Tier EXPEDITE (P1): Khi ảnh hưởng > 25 users.
         - Tier PRIORITY (P2): Khi ảnh hưởng từ 5 đến 25 users.
         - Tier STANDARD (P3): Khi ảnh hưởng < 5 users (Ví dụ: lỗi cho 1-2 học viên, 1 cá nhân).
         - GIẢI THÍCH: Ghi rõ số lượng user ước tính vào "priorityReason".

      2. CHẨN ĐOÁN: Dựa trên kho Resolved Tickets để chỉ ra nguyên nhân (VD: do phân bổ học phí CRM, do đồng bộ ID...).

      3. PHẢN HỒI (QUY TẮC PHONG CÁCH):
         - XƯNG HÔ: Chỉ dùng "Team" hoặc "Tech Team" (Bên mình) và "BU" hoặc "Bạn" (Bên gửi).
         - TUYỆT ĐỐI KHÔNG dùng: "mình", "nhà mình", "em/anh/chị".
         - KHÔNG để lại bất kỳ dấu ngoặc vuông [ ] hay [Name] nào. AI phải tự đóng vai Tech Team để trả lời.

      TRẢ VỀ JSON:
      {
        "category": "Loại vấn đề",
        "wikiSection": "Mục Wiki",
        "priority": "Tên Tier chuẩn (Expedite/Priority/Standard)",
        "priorityReason": "Lý do (VD: Ảnh hưởng 1 học viên (< 5 users) nên là Standard)",
        "diagnosis": "Nguyên nhân lỗi thực tế",
        "answer": "Nội dung phản hồi hoàn chỉnh"
      }
    `;

    try {
      const completion = await this.client.chat.completions.create({
        messages: [{ role: "user", content: prompt }],
        model: this.model,
        response_format: { type: "json_object" },
      });

      const choice = completion.choices[0];
      if (!choice || !choice.message?.content) throw new Error("AI không trả về nội dung.");
      return JSON.parse(choice.message.content);
    } catch (error: any) {
      console.error("AI Error:", error.message);
      return { 
        category: "Error", wikiSection: "2", priority: "N/A", 
        priorityReason: "Lỗi kết nối", diagnosis: "Lỗi kết nối AI",
        answer: "Lỗi kết nối AI: " + error.message 
      };
    }
  }
}
