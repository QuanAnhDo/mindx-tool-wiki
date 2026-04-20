import axios from "axios";
import { KnowledgeHit, KnowledgeSearchPort } from "../../application/ports/knowledge-search.port";

export class AzureWikiAdapter implements KnowledgeSearchPort {
  private org: string;
  private project: string;
  private pat: string;
  private wikiId: string;

  constructor() {
    this.org = process.env.AZURE_ORG || "techkids";
    this.project = process.env.AZURE_PROJECT || "mindx-cs-wiki";
    this.pat = process.env.AZURE_PAT || "";
    this.wikiId = process.env.AZURE_WIKI_ID || "mindx-cs-wiki.wiki";
  }

  async checkConnection(): Promise<{ ok: boolean; message: string }> {
    if (!this.pat) return { ok: false, message: "Thiếu mã PAT" };
    const auth = Buffer.from(`:${this.pat}`).toString("base64");
    const url = `https://dev.azure.com/${this.org}/_apis/projects/${this.project}?api-version=7.1`;
    try {
      await axios.get(url, { headers: { Authorization: `Basic ${auth}` } });
      return { ok: true, message: "Xác thực Azure DevOps thành công!" };
    } catch (error: any) {
      return { ok: false, message: `Lỗi: ${error.response?.status}` };
    }
  }

  async search(query: string, topK: number): Promise<KnowledgeHit[]> {
    if (!this.pat || !query) return [];

    // Chỉ lấy 3-5 từ khóa quan trọng nhất để Search không bị trả về 0
    const keywords = query
      .replace(/[^\w\sàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/gi, " ")
      .split(/\s+/)
      .filter(w => w.length > 2)
      .slice(0, 5)
      .join(" ");

    const url = `https://almsearch.dev.azure.com/${this.org}/_apis/search/wikiQueryResults?api-version=7.1-preview.1`;
    const auth = Buffer.from(`:${this.pat}`).toString("base64");

    try {
      const response = await axios.post(
        url,
        {
          searchText: keywords,
          $top: topK,
          takeResults: topK,
          filters: { "Project": [this.project], "Wiki": [this.wikiId] }
        },
        { headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" } }
      );

      const results = response.data.results || [];
      return results.map((res: any) => ({
        filePath: res.path,
        score: res.score || 1,
        snippet: res.hits?.[0]?.highlights 
          ? res.hits[0].highlights.replace(/<highlight>/g, "").replace(/<\/highlight>/g, "")
          : (res.content || "Nội dung Wiki")
      }));
    } catch (error) {
      return [];
    }
  }
}
