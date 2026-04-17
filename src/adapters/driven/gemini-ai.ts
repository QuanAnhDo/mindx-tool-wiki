import { GoogleGenerativeAI } from "@google/generative-ai";

export interface AIResponseGenerator {
  generateFullResponse(ticket: { title: string; description: string }, wikiContext: string): Promise<{
    category: string;
    wikiSection: string;
    priority: string;
    answer: string;
  }>;
}

export class GeminiAIAdapter implements AIResponseGenerator {
  private getModel() {
    const key = process.env.GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(key);
    return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  }

  async generateFullResponse(ticket: { title: string; description: string }, wikiContext: string): Promise<{
    category: string;
    wikiSection: string;
    priority: string;
    answer: string;
  }> {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "your_gemini_api_key_here") {
      return { 
        category: "N/A", wikiSection: "N/A", priority: "N/A", 
        answer: "LỖI: Chưa cấu hình API Key trong file .env" 
      };
    }

    const model = this.getModel();
    const prompt = `
      Bạn là chuyên gia hỗ trợ kỹ thuật MindX. Dựa vào kiến thức Wiki dưới đây, hãy xử lý ticket này.

      1. KIẾN THỨC WIKI (Quy định & Giải pháp thực tế):
      ${wikiContext}

      2. TICKET CẦN XỬ LÝ:
      Tiêu đề: ${ticket.title}
      Mô tả: ${ticket.description}

      NHIỆM VỤ:
      - Phân loại ticket (Category, Section 1-7, Priority P1-P3).
      - Viết một phản hồi CUỐI CÙNG chuyên nghiệp. 
      - TRONG PHẢN HỒI: Phải giải thích rõ vấn đề dựa trên Wiki và điền đầy đủ thông tin thực tế vào các dấu [ ].
      - Nếu Wiki có giải pháp (VD: lùi ngày order, không xóa phiếu bảo lưu), hãy đưa thẳng giải pháp đó vào câu trả lời.
      - X xưng hô: "Mình" (Tech Team) - "Nhà mình/Bạn" (BU).

      TRẢ VỀ KẾT QUẢ DẠNG JSON DUY NHẤT:
      {
        "category": "Loại vấn đề",
        "wikiSection": "Số mục 1-7",
        "priority": "P1/P2/P3",
        "answer": "Nội dung tin nhắn phản hồi sạch sẽ, không chứa [ ], không chứa mã HTML thừa"
      }
    `;

    try {
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      return JSON.parse(text);
    } catch (error: any) {
      if (error.status === 429) {
        return { 
          category: "Quota Exceeded", wikiSection: "N/A", priority: "N/A", 
          answer: "LỖI: Bạn đã hết hạn mức gọi AI trong phút này. Vui lòng đợi 30 giây rồi thử lại." 
        };
      }
      console.error("Gemini Error:", error);
      return { 
        category: "Error", wikiSection: "2", priority: "P3", 
        answer: "Có lỗi xảy ra khi kết nối AI. Vui lòng kiểm tra lại API Key hoặc kết nối mạng." 
      };
    }
  }
}
