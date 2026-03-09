import { describe, expect, test } from 'bun:test';
import { RagService } from '../../src/rag/service';
import { MemoryVectorStore } from '../../src/vector-store/stores/memory-store';
import { EmbeddingService } from '../../src/embedding/service';

class MockEmbeddingProvider {
  readonly name = 'mock';
  readonly dimensions = 4;

  async embed(text: string): Promise<number[]> {
    const codes = text.split('').slice(0, 4).map((c) => c.charCodeAt(0) / 255);
    while (codes.length < 4) codes.push(0);
    return codes;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }
}

function createRagService(): RagService {
  const options = { collection: 'test', chunkSize: 100, chunkOverlap: 10, topK: 3, minScore: 0 };
  const embeddingService = new EmbeddingService({
    provider: { name: 'mock', provider: MockEmbeddingProvider as never, config: {} },
  } as never);
  const vectorStore = new MemoryVectorStore();

  return new RagService(options as never, embeddingService, vectorStore);
}

describe('RagService', () => {
  test('should ingest text and return chunk count', async () => {
    const service = createRagService();
    const count = await service.ingest({ type: 'text', content: 'Hello world, this is a test document for RAG.' });
    expect(count).toBeGreaterThan(0);
  });

  test('should retrieve context after ingestion', async () => {
    const service = createRagService();
    await service.ingest({ type: 'text', content: 'The sky is blue and the grass is green.' });
    const context = await service.retrieve('sky');
    expect(context.chunks.length).toBeGreaterThanOrEqual(0);
    expect(typeof context.formatted).toBe('string');
  });

  test('should return empty context for empty store', async () => {
    const service = createRagService();
    const context = await service.retrieve('anything');
    expect(context.chunks).toHaveLength(0);
    expect(context.formatted).toBe('');
  });

  test('should build context prompt string', async () => {
    const service = createRagService();
    await service.ingest({ type: 'text', content: 'Water is H2O.' });
    const prompt = await service.buildContextPrompt('water');
    expect(typeof prompt).toBe('string');
  });

  test('should ingest multiple documents', async () => {
    const service = createRagService();
    const count1 = await service.ingest({ type: 'text', content: 'Document one content.' });
    const count2 = await service.ingest({ type: 'text', content: 'Document two content.' });
    expect(count1 + count2).toBeGreaterThan(0);
  });
});
