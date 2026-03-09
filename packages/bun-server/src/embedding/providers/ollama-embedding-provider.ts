import type { EmbeddingProvider } from '../types';
import { AiProviderError } from '../../ai/errors';

export interface OllamaEmbeddingProviderConfig {
  baseUrl?: string;
  /** Default: nomic-embed-text */
  model?: string;
  /** Dimensions depend on model. Default 768 for nomic-embed-text */
  dimensions?: number;
}

export class OllamaEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'ollama';
  public readonly dimensions: number;
  private readonly baseUrl: string;
  private readonly model: string;

  public constructor(config: OllamaEmbeddingProviderConfig = {}) {
    this.baseUrl = (config.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '');
    this.model = config.model ?? 'nomic-embed-text';
    this.dimensions = config.dimensions ?? 768;
  }

  public async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, input: text }),
    });

    if (!res.ok) throw new AiProviderError(await res.text(), 'ollama-embedding', res.status);
    const data = await res.json() as { embeddings: number[][] };
    return data.embeddings[0]!;
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}
