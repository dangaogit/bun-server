import { Injectable, Inject, AiTool } from '@dangao/bun-server';
import { RagService, RAG_SERVICE_TOKEN } from '@dangao/bun-server';

@Injectable()
export class KbQueryTool {
  public constructor(
    @Inject(RAG_SERVICE_TOKEN) private readonly rag: RagService,
  ) {}

  @AiTool({
    name: 'knowledge_base_query',
    description: 'Search the internal knowledge base for relevant information on a topic.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search query for the knowledge base' },
        collection: { type: 'string', description: 'Optional collection name (defaults to platform-kb)' },
      },
      required: ['query'],
    },
  })
  public async queryKb({ query, collection }: { query: string; collection?: string }): Promise<string> {
    const context = await this.rag.retrieve(query, collection);
    if (!context.formatted) {
      return 'No relevant information found in the knowledge base.';
    }
    return `Knowledge base results:\n${context.formatted}`;
  }
}
