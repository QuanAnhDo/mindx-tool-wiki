import axios from "axios";
import { KnowledgeHit, KnowledgeSearchPort } from "../../application/ports/knowledge-search.port";

export class AzureWikiAdapter implements KnowledgeSearchPort {
  private org: string;
  private project: string;
  private pat: string;

  constructor() {
    this.org = process.env.AZURE_ORG || "techkids";
    this.project = process.env.AZURE_PROJECT || "mindx-cs-wiki";
    this.pat = process.env.AZURE_PAT || "";
  }

  async search(query: string, topK: number): Promise<KnowledgeHit[]> {
    if (!this.pat || !query) return [];

    // Làm sạch từ khóa: Chỉ lấy từ khóa chính để Azure không bị bối rối
    const cleanQuery = query
      .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, " ")
      .trim();

    // Azure Search API 7.1-preview.1
    const url = `https://almsearch.dev.azure.com/${this.org}/_apis/search/wikiQueryResults?api-version=7.1-preview.1`;
    const auth = Buffer.from(`:${this.pat}`).toString("base64");

    try {
      const response = await axios.post(
        url,
        {
          searchText: cleanQuery,
          $top: topK,
          takeResults: topK,
          filters: { "Project": [this.project] }
        },
        {
          headers: {
            Authorization: `Basic ${auth}`,
            "Content-Type": "application/json",
          },
          timeout: 5000
        }
      );

      const data = response.data;
      if (data && data.results && Array.isArray(data.results)) {
        return data.results.map((res: any) => ({
          filePath: res.path,
          score: res.score || 1,
          snippet: res.hits?.[0]?.highlights 
            ? res.hits[0].highlights.replace(/<highlight>/g, "").replace(/<\/highlight>/g, "")
            : (res.content || "Nội dung Wiki")
        }));
      }
      return [];
    } catch (error: any) {
      console.error("Azure API Fail:", error.message);
      return [];
    }
  }
}
