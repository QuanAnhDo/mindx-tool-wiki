export interface KnowledgeMutationPort {
  appendResolution(category: string, issue: string, resolution: string): Promise<{ ok: boolean; message: string }>;
}
