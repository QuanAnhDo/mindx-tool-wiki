import { OutlookAdapter } from "../../adapters/driving/outlook-adapter";
import { OdooAdapter } from "../../adapters/driving/odoo-adapter";
import { AzureWikiAdapter } from "../../adapters/driven/azure-wiki";
import { OpenAIAdapter } from "../../adapters/driven/openai";
import { analyzeTicket } from "../../application/use-cases/analyze-ticket";
import dotenv from "dotenv";

dotenv.config();

const outlook = new OutlookAdapter();
const odoo = new OdooAdapter();
const wikiSearch = new AzureWikiAdapter();
const aiGenerator = new OpenAIAdapter();

// Regex linh hoạt hơn để tìm ID Odoo
const ODOO_ID_REGEX = /id=(\d+)/;

async function runOnce() {
  try {
    console.log("🔍 Đang đồng bộ Outlook & Odoo...");
    const me = await outlook.getCurrentUser();
    const agentName = me.displayName || "MindX Support TechTeam";

    const emails = await outlook.getLatestEmails(10);
    const messageList = emails.value || [];
    const results = [];

    console.log(`📩 Tìm thấy ${messageList.length} email mới nhất.`);

    for (const mail of messageList) {
      const subject = mail.subject || "";
      const bodyContent = mail.body?.content || "";
      const bodyPreview = mail.bodyPreview || "";

      // Kiểm tra cả trong Preview và Content HTML
      const isOfficialTicket = 
        bodyPreview.toLowerCase().includes("phiếu hỗ trợ") || 
        bodyContent.toLowerCase().includes("phiếu hỗ trợ") ||
        subject.toLowerCase().includes("ticket");

      if (!isOfficialTicket) {
        console.log(`- Bỏ qua: "${subject}" (Không phải phiếu hỗ trợ)`);
        continue;
      }

      // 1. Trích xuất ID Odoo
      const idMatch = bodyContent.match(ODOO_ID_REGEX) || bodyPreview.match(ODOO_ID_REGEX);
      const odooId = idMatch ? idMatch[1] : null;

      if (!odooId) {
        console.log(`- Cảnh báo: "${subject}" là ticket nhưng không tìm thấy ID Odoo.`);
        continue;
      }

      console.log(`📌 Đang chọc vào Odoo lấy dữ liệu cho ID: ${odooId}`);
      
      try {
        const odooData = await odoo.getTicketData(odooId);
        
        const analysis = await analyzeTicket(
          { 
            title: odooData.name || subject, 
            description: odooData.description || bodyPreview,
            agentName 
          },
          wikiSearch,
          aiGenerator
        );

        results.push({
          odoo_source: {
            id: odooId,
            title: odooData.name,
            student: odooData.x_student_name,
            paid: odooData.x_amount_paid
          },
          ...analysis,
          cli_command: `pnpm mail reply-id "${mail.id}" ${analysis.recommendedTemplate}`
        });
      } catch (e: any) {
        console.warn(`⚠️ Lỗi Odoo (ID: ${odooId}): ${e.message}`);
      }
    }

    if (results.length > 0) {
      console.log("\n--- [KẾT QUẢ PHÂN TÍCH] ---");
      console.log(JSON.stringify(results, null, 2));
    } else {
      console.log("\n❌ Không có ticket nào đủ điều kiện để chọc vào Odoo.");
    }

  } catch (error) {
    console.error("Worker Error:", error);
  }
}

async function start() {
  await outlook.authenticate();
  await runOnce();
}

start();
