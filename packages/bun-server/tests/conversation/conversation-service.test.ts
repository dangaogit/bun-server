import { describe, expect, test } from 'bun:test';
import { ConversationService } from '../../src/conversation/service';
import { MemoryConversationStore } from '../../src/conversation/stores/memory-store';

function createService(opts = {}) {
  const store = new MemoryConversationStore();
  return new ConversationService({ store, maxMessages: 10, autoTrim: true, ...opts } as never);
}

describe('ConversationService', () => {
  test('should create a conversation', async () => {
    const service = createService();
    const conv = await service.create({ userId: 'u1' });
    expect(conv.id).toBeDefined();
    expect(conv.metadata['userId']).toBe('u1');
    expect(conv.messages).toHaveLength(0);
  });

  test('should append messages', async () => {
    const service = createService();
    const conv = await service.create();
    await service.appendMessage(conv.id, { role: 'user', content: 'Hello' });
    await service.appendMessage(conv.id, { role: 'assistant', content: 'Hi!' });

    const history = await service.getHistory(conv.id);
    expect(history).toHaveLength(2);
    expect(history[0]!.content).toBe('Hello');
    expect(history[1]!.content).toBe('Hi!');
  });

  test('should auto-trim when maxMessages exceeded', async () => {
    const service = createService({ maxMessages: 3, autoTrim: true });
    const conv = await service.create();

    for (let i = 0; i < 5; i++) {
      await service.appendMessage(conv.id, { role: 'user', content: `Message ${i}` });
    }

    const history = await service.getHistory(conv.id);
    expect(history.length).toBeLessThanOrEqual(3);
  });

  test('should delete a conversation', async () => {
    const service = createService();
    const conv = await service.create();
    const deleted = await service.delete(conv.id);
    expect(deleted).toBe(true);
    expect(await service.get(conv.id)).toBeNull();
  });

  test('should list conversation ids', async () => {
    const service = createService();
    await service.create();
    await service.create();
    const ids = await service.list();
    expect(ids.length).toBe(2);
  });

  test('should return null for missing conversation', async () => {
    const service = createService();
    const result = await service.get('non-existent');
    expect(result).toBeNull();
  });
});
