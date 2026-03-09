import { describe, expect, test } from 'bun:test';
import { MemoryVectorStore } from '../../src/vector-store/stores/memory-store';
import { cosineSimilarity } from '../../src/vector-store/types';

describe('MemoryVectorStore', () => {
  test('should upsert and retrieve a document', async () => {
    const store = new MemoryVectorStore();
    await store.upsert({ id: 'doc1', vector: [1, 0, 0], content: 'Test', collection: 'col' });
    const doc = await store.get('doc1', 'col');
    expect(doc).not.toBeNull();
    expect(doc!.content).toBe('Test');
  });

  test('should return null for missing document', async () => {
    const store = new MemoryVectorStore();
    expect(await store.get('missing')).toBeNull();
  });

  test('should search by cosine similarity', async () => {
    const store = new MemoryVectorStore();
    await store.upsert({ id: 'a', vector: [1, 0, 0], content: 'Horizontal', collection: 'test' });
    await store.upsert({ id: 'b', vector: [0, 1, 0], content: 'Vertical', collection: 'test' });
    await store.upsert({ id: 'c', vector: [0.9, 0.1, 0], content: 'Mostly horizontal', collection: 'test' });

    const results = await store.search([1, 0, 0], { topK: 2, collection: 'test' });
    expect(results).toHaveLength(2);
    // Most similar to [1,0,0] should be doc 'a' first
    expect(results[0]!.document.id).toBe('a');
    expect(results[0]!.score).toBeCloseTo(1.0, 2);
  });

  test('should filter by collection', async () => {
    const store = new MemoryVectorStore();
    await store.upsert({ id: '1', vector: [1, 0], content: 'A', collection: 'col1' });
    await store.upsert({ id: '2', vector: [1, 0], content: 'B', collection: 'col2' });

    const results = await store.search([1, 0], { collection: 'col1' });
    expect(results).toHaveLength(1);
    expect(results[0]!.document.content).toBe('A');
  });

  test('should delete a document', async () => {
    const store = new MemoryVectorStore();
    await store.upsert({ id: 'del', vector: [1, 0], content: 'Delete me' });
    const deleted = await store.delete('del');
    expect(deleted).toBe(true);
    expect(await store.get('del')).toBeNull();
  });

  test('should delete entire collection', async () => {
    const store = new MemoryVectorStore();
    await store.upsert({ id: '1', vector: [1, 0], content: 'A', collection: 'purge' });
    await store.upsert({ id: '2', vector: [0, 1], content: 'B', collection: 'purge' });
    await store.deleteCollection('purge');
    expect(await store.count('purge')).toBe(0);
  });

  test('should count documents', async () => {
    const store = new MemoryVectorStore();
    await store.upsert({ id: '1', vector: [1], content: 'A', collection: 'x' });
    await store.upsert({ id: '2', vector: [2], content: 'B', collection: 'x' });
    await store.upsert({ id: '3', vector: [3], content: 'C', collection: 'y' });
    expect(await store.count()).toBe(3);
    expect(await store.count('x')).toBe(2);
  });
});

describe('cosineSimilarity', () => {
  test('identical vectors have similarity 1.0', () => {
    expect(cosineSimilarity([1, 0, 0], [1, 0, 0])).toBeCloseTo(1.0);
  });

  test('orthogonal vectors have similarity 0.0', () => {
    expect(cosineSimilarity([1, 0], [0, 1])).toBeCloseTo(0.0);
  });

  test('opposite vectors have similarity -1.0', () => {
    expect(cosineSimilarity([1, 0], [-1, 0])).toBeCloseTo(-1.0);
  });

  test('zero vectors return 0', () => {
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });
});
