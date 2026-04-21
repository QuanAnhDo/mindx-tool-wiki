import axios from "axios";
import { KnowledgeHit, KnowledgeSearchPort } from "../../application/ports/knowledge-search.port";
import { KnowledgeMutationPort } from "../../application/ports/knowledge-mutation.port";

export class AzureWikiAdapter implements KnowledgeSearchPort, KnowledgeMutationPort {
  private org: string;
  private project: string;
  private pat: string;
  private wikiId: string;
  private baseApiUrl: string;

  constructor() {
    this.org = process.env.AZURE_ORG || "techkids";
    this.project = process.env.AZURE_PROJECT || "mindx-cs-wiki";
    this.pat = process.env.AZURE_PAT || "";
    this.wikiId = process.env.AZURE_WIKI_ID || "mindx-cs-wiki.wiki";
    this.baseApiUrl = `https://dev.azure.com/${this.org}/${this.project}/_apis/wiki/wikis/${this.wikiId}`;
  }

  private getAuthHeader() {
    return { Authorization: `Basic ${Buffer.from(`:${this.pat}`).toString("base64")}` };
  }

  /**
   * API LẤY NỘI DUNG TRỰC TIẾP (Không qua Search)
   */
  async getWikiPage(sectionId: string): Promise<KnowledgeHit | null> {
    const auth = this.getAuthHeader();
    try {
      // 1. Lấy cây danh mục để tìm Path
      const listUrl = `${this.baseApiUrl}/pages?recursionLevel=full&api-version=7.1`;
      const listRes = await axios.get(listUrl, { headers: auth });
      
      const findPage = (pages: any[]): any => {
        for (const p of pages) {
          // So khớp số mục (ví dụ "8.1") trong đường dẫn trang
          if (p.path?.includes(sectionId)) return p;
          if (p.subPages) {
            const found = findPage(p.subPages);
            if (found) return found;
          }
        }
      };

      const pages = listRes.data.subPages || listRes.data.pages || [];
      const targetPage = findPage(pages);

      if (!targetPage) return null;

      // 2. Lấy nội dung Markdown của trang đó
      const pageUrl = `${this.baseApiUrl}/pages?path=${encodeURIComponent(targetPage.path)}&includeContent=true&api-version=7.1`;
      const contentRes = await axios.get(pageUrl, { headers: auth });

      return {
        filePath: targetPage.path,
        score: 100,
        snippet: contentRes.data.content || "Trang không có nội dung."
      };
    } catch (error: any) {
      console.error(`[Azure API Error]: ${error.message}`);
      return null;
    }
  }

  // Giữ lại hàm search cũ để dùng cho các mục đích tìm kiếm linh hoạt khác
  async search(query: string, topK: number): Promise<KnowledgeHit[]> {
    const directMatch = await this.getWikiPage(query);
    if (directMatch) return [directMatch];
    return [];
  }

  async appendResolution(category: string, issue: string, resolution: string): Promise<{ ok: boolean; message: string }> {
    const auth = this.getAuthHeader();
    try {
      const pagePath = "/8.-Resolved-Tickets/8.1-Past-Resolutions-Log";
      const url = `${this.baseApiUrl}/pages?path=${encodeURIComponent(pagePath)}&includeContent=true&api-version=7.1`;
      const getRes = await axios.get(url, { headers: auth });
      const currentContent = getRes.data.content || "";
      const eTag = getRes.headers["etag"];
      const newEntry = `\n---\n## [Category: ${category}] ${issue}\n- **Issue**: ${issue}\n- **Historical Solution**: \n    - **Resolution**: ${resolution}\n`;
      await axios.put(url, { content: currentContent + newEntry }, {
        headers: { ...auth, "Content-Type": "application/json", "If-Match": eTag }
      });
      return { ok: true, message: "Da cap nhat thanh cong!" };
    } catch (error: any) {
      return { ok: false, message: "Loi: " + error.message };
    }
  }
}
