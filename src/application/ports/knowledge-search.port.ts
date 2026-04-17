export type KnowledgeHit = {
  filePath: string;
  score: number;
  snippet: string;
};

export interface KnowledgeSearchPort {
  search(query: string, topK: number): Promise<KnowledgeHit[]>;
}
