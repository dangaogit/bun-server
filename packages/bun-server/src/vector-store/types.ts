/**
 * A document stored in the vector store
 */
export interface VectorDocument {
  id: string;
  /** The embedding vector */
  vector: number[];
  /** Original text content */
  content: string;
  /** Arbitrary metadata */
  metadata?: Record<string, unknown>;
  /** Collection / namespace */
  collection?: string;
}

/**
 * Search result with similarity score
 */
export interface VectorSearchResult {
  document: VectorDocument;
  /** Cosine similarity score [0, 1] */
  score: number;
}

/**
 * Search options
 */
export interface VectorSearchOptions {
  topK?: number;
  minScore?: number;
  collection?: string;
  filter?: (doc: VectorDocument) => boolean;
}

/**
 * Abstract vector store interface
 */
export interface VectorStore {
  /** Insert or update a document */
  upsert(document: VectorDocument): Promise<void>;
  /** Insert or update multiple documents */
  upsertBatch(documents: VectorDocument[]): Promise<void>;
  /** Retrieve a document by ID */
  get(id: string, collection?: string): Promise<VectorDocument | null>;
  /** Search for similar documents using cosine similarity */
  search(query: number[], options?: VectorSearchOptions): Promise<VectorSearchResult[]>;
  /** Delete a document by ID */
  delete(id: string, collection?: string): Promise<boolean>;
  /** Delete all documents in a collection */
  deleteCollection(collection: string): Promise<void>;
  /** Count documents */
  count(collection?: string): Promise<number>;
}

export interface VectorStoreModuleOptions {
  store?: VectorStore;
}

export const VECTOR_STORE_TOKEN = Symbol('@dangao/bun-server:vector-store:store');
export const VECTOR_STORE_OPTIONS_TOKEN = Symbol('@dangao/bun-server:vector-store:options');

/**
 * Compute cosine similarity between two vectors
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
