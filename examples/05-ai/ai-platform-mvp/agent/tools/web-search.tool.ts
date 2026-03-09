import { Injectable, AiTool } from '@dangao/bun-server';

@Injectable()
export class WebSearchTool {
  /** Simulated search results (replace with real API in production) */
  private readonly mockResults: Record<string, string> = {
    bun: 'Bun is a fast JavaScript runtime built with JavaScriptCore. It includes a bundler, test runner, and package manager.',
    dify: 'Dify is an open-source LLM application development platform providing RAG, agents, and LLMOps capabilities.',
    llm: 'Large Language Models (LLMs) are AI models trained on large text datasets capable of understanding and generating human language.',
    typescript: 'TypeScript is a strongly typed programming language that builds on JavaScript with static type definitions.',
  };

  @AiTool({
    name: 'web_search',
    description: 'Search the web for current information on a topic. Returns relevant snippets.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query' },
      },
      required: ['query'],
    },
  })
  public async search({ query }: { query: string }): Promise<string> {
    // Simulated search — in production, call a real search API (Serper, Tavily, etc.)
    await new Promise((resolve) => setTimeout(resolve, 100));

    const lowerQuery = query.toLowerCase();
    for (const [key, result] of Object.entries(this.mockResults)) {
      if (lowerQuery.includes(key)) {
        return `Search results for "${query}":\n${result}`;
      }
    }

    return `Search results for "${query}":\nNo specific information found. Based on general knowledge, ${query} is a topic that may require further research.`;
  }
}
