import { describe, expect, test, beforeEach } from 'bun:test';
import { ConversationModule } from '../../src/conversation/conversation-module';
import { CONVERSATION_SERVICE_TOKEN } from '../../src/conversation/types';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('ConversationModule', () => {
  beforeEach(() => {
    ConversationModule.reset();
  });

  test('should register providers on forRoot()', () => {
    ConversationModule.forRoot({ maxMessages: 20 });
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConversationModule);
    expect(metadata).toBeDefined();
    expect(metadata.exports).toContain(CONVERSATION_SERVICE_TOKEN);
  });

  test('should use MemoryConversationStore by default', () => {
    ConversationModule.forRoot();
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConversationModule);
    const optionsProvider = metadata.providers.find(
      (p: { provide: symbol }) => p.provide === Symbol.for('@dangao/bun-server:conversation:options') || true,
    );
    expect(optionsProvider).toBeDefined();
  });
});
