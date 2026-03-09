import { Injectable } from '../di/decorators';
import { Inject } from '../di/decorators';
import type { EmbeddingProvider, EmbeddingModuleOptions } from './types';
import { EMBEDDING_OPTIONS_TOKEN } from './types';

/**
 * Embedding service — generates vector embeddings for text using the configured provider.
 */
@Injectable()
export class EmbeddingService {
  private readonly provider: EmbeddingProvider;
  private readonly batchSize: number;

  public constructor(
    @Inject(EMBEDDING_OPTIONS_TOKEN) options: EmbeddingModuleOptions,
  ) {
    this.provider = new options.provider.provider(options.provider.config);
    this.batchSize = options.batchSize ?? 100;
  }

  /**
   * Generate an embedding vector for a single text
   */
  public async embed(text: string): Promise<number[]> {
    return this.provider.embed(text);
  }

  /**
   * Generate embedding vectors for multiple texts.
   * Automatically batches requests to stay within provider limits.
   */
  public async embedBatch(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += this.batchSize) {
      const batch = texts.slice(i, i + this.batchSize);
      const embeddings = await this.provider.embedBatch(batch);
      results.push(...embeddings);
    }
    return results;
  }

  /**
   * Number of dimensions in embeddings produced by this provider
   */
  public get dimensions(): number {
    return this.provider.dimensions;
  }

  /**
   * Provider name
   */
  public get providerName(): string {
    return this.provider.name;
  }
}
