import type { EmbeddingProvider } from '../types';
import { AiProviderError, AiRateLimitError } from '../../ai/errors';

export interface OpenAIEmbeddingProviderConfig {
  apiKey: string;
  /** Default: text-embedding-3-small */
  model?: string;
  baseUrl?: string;
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly name = 'openai';
  public readonly dimensions: number;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;

  public constructor(config: OpenAIEmbeddingProviderConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model ?? 'text-embedding-3-small';
    this.baseUrl = (config.baseUrl ?? 'https://api.openai.com/v1').replace(/\/$/, '');
    // text-embedding-3-small: 1536, text-embedding-3-large: 3072
    this.dimensions = this.model.includes('large') ? 3072 : 1536;
  }

  public async embed(text: string): Promise<number[]> {
    const results = await this.embedBatch([text]);
    return results[0]!;
  }

  public async embedBatch(texts: string[]): Promise<number[][]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ input: texts, model: this.model }),
    });

    if (res.status === 429) throw new AiRateLimitError('openai-embedding');
    if (!res.ok) throw new AiProviderError(await res.text(), 'openai-embedding', res.status);

    const data = await res.json() as { data: Array<{ embedding: number[] }> };
    return data.data.map((d) => d.embedding);
  }
}
