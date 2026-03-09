import type { VectorStore, VectorDocument, VectorSearchResult, VectorSearchOptions } from '../types';

export interface QdrantStoreConfig {
  /** Qdrant server URL (default: http://localhost:6333) */
  url?: string;
  /** Collection name in Qdrant */
  collectionName: string;
  /** API key (optional, for Qdrant Cloud) */
  apiKey?: string;
}

/**
 * Qdrant vector store adapter.
 * Uses the Qdrant REST API directly — no SDK dependency.
 */
export class QdrantVectorStore implements VectorStore {
  private readonly url: string;
  private readonly collectionName: string;
  private readonly apiKey: string | undefined;

  public constructor(config: QdrantStoreConfig) {
    this.url = (config.url ?? 'http://localhost:6333').replace(/\/$/, '');
    this.collectionName = config.collectionName;
    this.apiKey = config.apiKey;
  }

  public async upsert(document: VectorDocument): Promise<void> {
    await this.upsertBatch([document]);
  }

  public async upsertBatch(documents: VectorDocument[]): Promise<void> {
    const points = documents.map((d, idx) => ({
      id: this.toNumericId(d.id) ?? idx,
      vector: d.vector,
      payload: {
        original_id: d.id,
        content: d.content,
        collection: d.collection ?? '',
        ...(d.metadata ?? {}),
      },
    }));

    await this.request(`/collections/${this.collectionName}/points`, 'PUT', { points });
  }

  public async get(id: string): Promise<VectorDocument | null> {
    const numId = this.toNumericId(id);
    if (!numId) return null;

    const res = await this.request<{ result: Record<string, unknown> | null }>(
      `/collections/${this.collectionName}/points/${numId}`,
      'GET',
    );
    const point = res?.['result'];
    if (!point) return null;

    const payload = (point['payload'] as Record<string, unknown>) ?? {};
    return {
      id: (payload['original_id'] as string) ?? id,
      vector: (point['vector'] as number[]) ?? [],
      content: (payload['content'] as string) ?? '',
      collection: (payload['collection'] as string) || undefined,
      metadata: payload,
    };
  }

  public async search(query: number[], options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { topK = 5, minScore = 0, collection } = options;

    const body: Record<string, unknown> = {
      vector: query,
      limit: topK,
      with_payload: true,
      score_threshold: minScore,
    };

    if (collection) {
      body['filter'] = { must: [{ key: 'collection', match: { value: collection } }] };
    }

    const res = await this.request<{ result: Array<Record<string, unknown>> }>(
      `/collections/${this.collectionName}/points/search`,
      'POST',
      body,
    );

    return (res?.['result'] ?? []).map((hit) => {
      const payload = (hit['payload'] as Record<string, unknown>) ?? {};
      return {
        document: {
          id: (payload['original_id'] as string) ?? String(hit['id']),
          vector: [],
          content: (payload['content'] as string) ?? '',
          collection: (payload['collection'] as string) || undefined,
          metadata: payload,
        },
        score: hit['score'] as number,
      };
    });
  }

  public async delete(id: string): Promise<boolean> {
    const numId = this.toNumericId(id);
    if (!numId) return false;
    await this.request(
      `/collections/${this.collectionName}/points/delete`,
      'POST',
      { points: [numId] },
    );
    return true;
  }

  public async deleteCollection(collection: string): Promise<void> {
    await this.request(
      `/collections/${this.collectionName}/points/delete`,
      'POST',
      { filter: { must: [{ key: 'collection', match: { value: collection } }] } },
    );
  }

  public async count(): Promise<number> {
    const res = await this.request<{ result: { count: number } }>(
      `/collections/${this.collectionName}/points/count`,
      'POST',
      {},
    );
    return res?.['result']?.count ?? 0;
  }

  private toNumericId(id: string): number | null {
    const n = parseInt(id, 10);
    return isNaN(n) ? null : n;
  }

  private async request<T = unknown>(path: string, method: string, body?: unknown): Promise<T | null> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['api-key'] = this.apiKey;

    const res = await fetch(`${this.url}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) return null;
    return res.json() as Promise<T>;
  }
}
