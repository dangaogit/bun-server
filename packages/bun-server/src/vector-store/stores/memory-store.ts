import type { VectorStore, VectorDocument, VectorSearchResult, VectorSearchOptions } from '../types';
import { cosineSimilarity } from '../types';

/**
 * High-performance in-memory vector store using cosine similarity.
 * Suitable for development and small to medium datasets (up to ~100K documents).
 */
export class MemoryVectorStore implements VectorStore {
  private readonly documents = new Map<string, VectorDocument>();

  public async upsert(document: VectorDocument): Promise<void> {
    this.documents.set(this.key(document.id, document.collection), document);
  }

  public async upsertBatch(documents: VectorDocument[]): Promise<void> {
    for (const doc of documents) {
      this.documents.set(this.key(doc.id, doc.collection), doc);
    }
  }

  public async get(id: string, collection?: string): Promise<VectorDocument | null> {
    return this.documents.get(this.key(id, collection)) ?? null;
  }

  public async search(query: number[], options: VectorSearchOptions = {}): Promise<VectorSearchResult[]> {
    const { topK = 5, minScore = 0, collection, filter } = options;

    const results: VectorSearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (collection && doc.collection !== collection) continue;
      if (filter && !filter(doc)) continue;

      const score = cosineSimilarity(query, doc.vector);
      if (score >= minScore) {
        results.push({ document: doc, score });
      }
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  public async delete(id: string, collection?: string): Promise<boolean> {
    return this.documents.delete(this.key(id, collection));
  }

  public async deleteCollection(collection: string): Promise<void> {
    for (const [key, doc] of this.documents.entries()) {
      if (doc.collection === collection) {
        this.documents.delete(key);
      }
    }
  }

  public async count(collection?: string): Promise<number> {
    if (!collection) return this.documents.size;
    let count = 0;
    for (const doc of this.documents.values()) {
      if (doc.collection === collection) count++;
    }
    return count;
  }

  private key(id: string, collection?: string): string {
    return collection ? `${collection}:${id}` : id;
  }
}
