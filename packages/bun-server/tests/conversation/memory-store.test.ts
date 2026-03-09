import { describe, expect, test } from 'bun:test';
import { MemoryConversationStore } from '../../src/conversation/stores/memory-store';

describe('MemoryConversationStore', () => {
  test('should create and retrieve conversation', async () => {
    const store = new MemoryConversationStore();
    const conv = await store.create({ tag: 'test' });

    expect(conv.id).toBeDefined();
    expect(conv.messages).toHaveLength(0);

    const retrieved = await store.get(conv.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(conv.id);
  });

  test('should append messages', async () => {
    const store = new MemoryConversationStore();
    const conv = await store.create();
    await store.appendMessage(conv.id, { role: 'user', content: 'Hello' });

    const retrieved = await store.get(conv.id);
    expect(retrieved!.messages).toHaveLength(1);
    expect(retrieved!.messages[0]!.content).toBe('Hello');
  });

  test('should trim old messages', async () => {
    const store = new MemoryConversationStore();
    const conv = await store.create();

    for (let i = 0; i < 5; i++) {
      await store.appendMessage(conv.id, { role: 'user', content: `msg${i}` });
    }

    await store.trim(conv.id, 3);
    const retrieved = await store.get(conv.id);
    expect(retrieved!.messages).toHaveLength(3);
    // Should keep the most recent
    expect(retrieved!.messages[0]!.content).toBe('msg2');
  });

  test('should delete conversation', async () => {
    const store = new MemoryConversationStore();
    const conv = await store.create();
    const deleted = await store.delete(conv.id);
    expect(deleted).toBe(true);
    expect(await store.get(conv.id)).toBeNull();
  });

  test('should list all conversations', async () => {
    const store = new MemoryConversationStore();
    await store.create();
    await store.create();
    await store.create();
    const ids = await store.list();
    expect(ids).toHaveLength(3);
  });

  test('should return null for missing id', async () => {
    const store = new MemoryConversationStore();
    expect(await store.get('missing')).toBeNull();
  });

  test('should throw on appendMessage to missing conversation', async () => {
    const store = new MemoryConversationStore();
    expect(store.appendMessage('missing', { role: 'user', content: 'hi' })).rejects.toThrow();
  });
});
