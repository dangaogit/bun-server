/**
 * Abstract embedding provider interface
 */
export interface EmbeddingProvider {
  /** Generate embedding vector for a single text */
  embed(text: string): Promise<number[]>;
  /** Generate embedding vectors for multiple texts (batch) */
  embedBatch(texts: string[]): Promise<number[][]>;
  /** Embedding dimensions */
  readonly dimensions: number;
  readonly name: string;
}

export interface EmbeddingProviderConfig<T = unknown> {
  name: string;
  provider: new (config: T) => EmbeddingProvider;
  config: T;
}

export interface EmbeddingModuleOptions {
  provider: EmbeddingProviderConfig;
  /** Max texts per batch request (default: 100) */
  batchSize?: number;
}

export const EMBEDDING_SERVICE_TOKEN = Symbol('@dangao/bun-server:embedding:service');
export const EMBEDDING_OPTIONS_TOKEN = Symbol('@dangao/bun-server:embedding:options');
