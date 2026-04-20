export interface AIResponseGenerator {
  generateFullResponse(
    ticket: { title: string; description: string },
    wikiContext: string,
    agentName?: string
  ): Promise<{
    category: string;
    wikiSection: string;
    priority: string;
    priorityReason: string;
    diagnosis: string;
    recommendedTemplate: string;
    acknowledgment: string;
    analysisResponse: string;
    fullAnswer: string;
  }>;
}
