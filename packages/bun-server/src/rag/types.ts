/**
 * A chunk of text produced by a document chunker
 */
export interface DocumentChunk {
  content: string;
  metadata?: Record<string, unknown>;
}

/**
 * Source for document ingestion
 */
export type IngestSource =
  | { type: 'text'; content: string; metadata?: Record<string, unknown> }
  | { type: 'file'; path: string; metadata?: Record<string, unknown> }
  | { type: 'url'; url: string; metadata?: Record<string, unknown> };

/**
 * Abstract document chunker
 */
export interface DocumentChunker {
  chunk(text: string): DocumentChunk[];
}

/**
 * Retrieved context for RAG
 */
export interface RagContext {
  chunks: Array<{ content: string; score: number; metadata?: Record<string, unknown> }>;
  /** Formatted context string for inclusion in prompts */
  formatted: string;
}

export interface RagModuleOptions {
  /** Collection name in VectorStore (default: 'rag') */
  collection?: string;
  /** Number of chunks per ingested document (default: 512) */
  chunkSize?: number;
  /** Overlap between consecutive chunks (default: 50) */
  chunkOverlap?: number;
  /** Number of top results to retrieve (default: 5) */
  topK?: number;
  /** Minimum similarity score to include (default: 0.5) */
  minScore?: number;
}

export const RAG_SERVICE_TOKEN = Symbol('@dangao/bun-server:rag:service');
export const RAG_OPTIONS_TOKEN = Symbol('@dangao/bun-server:rag:options');
