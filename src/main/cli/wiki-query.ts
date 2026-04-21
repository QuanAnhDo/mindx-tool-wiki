import { AzureWikiAdapter } from "../../adapters/driven/azure-wiki";
import dotenv from "dotenv";

dotenv.config();

const azureWiki = new AzureWikiAdapter();
const sectionId = process.argv[2];

async function fetchWiki() {
  if (!sectionId) {
    console.log("Cach dung: npm run wiki [so muc]");
    console.log("Vi du: npm run wiki 1 hoặc npm run wiki 8.1");
    return;
  }

  console.log(`--- Dang truy xuat muc: ${sectionId} ---`);

  try {
    const results = await azureWiki.search(sectionId, 1);

    if (!results || results.length === 0) {
      console.log(`Khong tim thay du lieu cho muc ${sectionId}.`);
      return;
    }

    const match = results[0];
    
    // Kiem tra an toan de thoa man TypeScript
    if (match) {
      console.log(`\nNguon: ${match.filePath}`);
      console.log("--------------------------------------------------");
      console.log(match.snippet);
      console.log("--------------------------------------------------");
    }
    
  } catch (error: any) {
    console.error("Loi ket noi tri thuc:", error.message);
  }
}

fetchWiki();
