import type { VectorStore, VectorDocument, VectorSearchResult, VectorSearchOptions } from '../types';

export interface PineconeStoreConfig {
  apiKey: string;
  /** Pinecone host URL (e.g., https://my-index-xxxx.svc.aped-xxxx.pinecone.io) */
  host: string;
  /** Namespace (optional) */
  namespace?: string;
}

/**
 * Pinecone vector store adapter.
 * Uses the Pinecone REST API directly — no SDK dependency.
 */
export class PineconeVectorStore implements VectorStore {
  private readonly apiKey: string;
  private readonly host: string;
  private readonly namespace: string;

  public constructor(config: PineconeStoreConfig) {
    this.apiKey = config.apiKey;
    this.host = config.host.replace(/\/$/, '');
    this.namespace = config.namespace ?? '';
  }

  public async upsert(document: VectorDocument): Promise<void> {
    await this.upsertBatch([document]);
  }

  public async upsertBatch(documents: VectorDocument[]): Promise<void> {
    const vectors = documents.map((d) => ({
      id: d.id,
      values: d.vector,
      metadata: { content: d.content, collection: d.collection ?? '', ...d.metadata },
    }));

    await this.request('/vectors/upsert', 'POST', { vectors, namespace: this.namespace });
  }

  public async get(id: string): Promise<VectorDocument | null> {
    const res = await this.request<{ vectors: Record<string, unknown> }>(
      `/vectors/fetch?ids=${encodeURIComponent(id)}&namespace=${this.namespace}`,
      'GET',
    );
    const vector = res?.['vectors']?.[id] as Record<string, unknown> | undefined;
    if (!vector) return null;
    const metadata = (vector['metadata'] as Record<string, unknown>) ?? {};
    return {
      id,
      vector: vector['values'] as number[],
      content: (metadata['content'] as string) ?? '',
      collection: (metadata['collection'] as string) || undefined,
      metadata,
    };
  }

  public async search(query: number[], options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { topK = 5, collection } = options;
    const filter = collection ? { collection: { $eq: collection } } : undefined;

    const res = await this.request<{ matches: Array<Record<string, unknown>> }>(
      '/query',
      'POST',
      {
        vector: query,
        topK,
        includeMetadata: true,
        namespace: this.namespace,
        filter,
      },
    );

    return (res?.['matches'] ?? []).map((match) => {
      const metadata = (match['metadata'] as Record<string, unknown>) ?? {};
      return {
        document: {
          id: match['id'] as string,
          vector: [],
          content: (metadata['content'] as string) ?? '',
          collection: (metadata['collection'] as string) || undefined,
          metadata,
        },
        score: match['score'] as number,
      };
    });
  }

  public async delete(id: string): Promise<boolean> {
    await this.request('/vectors/delete', 'POST', { ids: [id], namespace: this.namespace });
    return true;
  }

  public async deleteCollection(collection: string): Promise<void> {
    await this.request('/vectors/delete', 'POST', {
      deleteAll: false,
      namespace: this.namespace,
      filter: { collection: { $eq: collection } },
    });
  }

  public async count(): Promise<number> {
    const res = await this.request<{ namespaces: Record<string, { vectorCount: number }> }>(
      '/describe_index_stats',
      'POST',
      {},
    );
    const ns = res?.['namespaces']?.[this.namespace];
    return ns?.vectorCount ?? 0;
  }

  private async request<T = unknown>(path: string, method: string, body?: unknown): Promise<T | null> {
    const res = await fetch(`${this.host}${path}`, {
      method,
      headers: {
        'Api-Key': this.apiKey,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  }
}
