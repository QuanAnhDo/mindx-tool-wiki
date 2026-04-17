export interface AIResponseGenerator {
  generateFullResponse(
    ticket: { title: string; description: string },
    wikiContext: string
  ): Promise<{
    category: string;
    wikiSection: string;
    priority: string;
    priorityReason: string;
    diagnosis: string;
    answer: string;
  }>;
}
