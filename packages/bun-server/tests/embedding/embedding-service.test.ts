import { describe, expect, test } from 'bun:test';
import { EmbeddingService } from '../../src/embedding/service';

class MockEmbeddingProvider {
  readonly name = 'mock';
  readonly dimensions = 4;

  async embed(text: string): Promise<number[]> {
    return [text.length / 100, 0.2, 0.3, 0.4];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map((t) => [t.length / 100, 0.2, 0.3, 0.4]);
  }
}

function createService(batchSize = 100): EmbeddingService {
  return new EmbeddingService({
    provider: { name: 'mock', provider: MockEmbeddingProvider as never, config: {} },
    batchSize,
  } as never);
}

describe('EmbeddingService', () => {
  test('should embed a single text', async () => {
    const service = createService();
    const vec = await service.embed('hello');
    expect(vec).toHaveLength(4);
    expect(Array.isArray(vec)).toBe(true);
  });

  test('should embedBatch multiple texts', async () => {
    const service = createService();
    const vecs = await service.embedBatch(['hello', 'world', 'foo']);
    expect(vecs).toHaveLength(3);
    expect(vecs[0]).toHaveLength(4);
  });

  test('should report correct dimensions', () => {
    const service = createService();
    expect(service.dimensions).toBe(4);
  });

  test('should report provider name', () => {
    const service = createService();
    expect(service.providerName).toBe('mock');
  });

  test('should handle batch larger than batchSize', async () => {
    const service = createService(2);
    const texts = ['a', 'b', 'c', 'd', 'e'];
    const vecs = await service.embedBatch(texts);
    expect(vecs).toHaveLength(5);
  });
});
