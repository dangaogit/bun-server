import { Injectable, Inject } from '@dangao/bun-server';
import { RagService, RAG_SERVICE_TOKEN } from '@dangao/bun-server';
import type { IngestSource } from '@dangao/bun-server';

export interface IngestRequest {
  text?: string;
  url?: string;
  collection?: string;
}

export interface SearchRequest {
  query: string;
  collection?: string;
  topK?: number;
}

@Injectable()
export class KnowledgeService {
  public constructor(
    @Inject(RAG_SERVICE_TOKEN) private readonly rag: RagService,
  ) {}

  public async ingest(request: IngestRequest): Promise<{ chunks: number; collection: string }> {
    const collection = request.collection ?? 'platform-kb';
    let source: IngestSource;

    if (request.url) {
      source = { type: 'url', url: request.url };
    } else if (request.text) {
      source = { type: 'text', content: request.text };
    } else {
      return { chunks: 0, collection };
    }

    const chunks = await this.rag.ingest(source, collection);
    return { chunks, collection };
  }

  public async search(request: SearchRequest) {
    const context = await this.rag.retrieve(request.query, request.collection);
    return {
      query: request.query,
      results: context.chunks.map((c, i) => ({
        rank: i + 1,
        score: c.score,
        content: c.content,
        metadata: c.metadata,
      })),
    };
  }
}
