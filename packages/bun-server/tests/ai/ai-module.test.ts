import { describe, expect, test, beforeEach } from 'bun:test';
import { AiModule } from '../../src/ai/ai-module';
import { AI_SERVICE_TOKEN, AI_TOOL_REGISTRY_TOKEN, MODULE_METADATA_KEY as _MK } from '../../src/ai/types';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('AiModule', () => {
  beforeEach(() => {
    AiModule.reset();
  });

  test('should register providers on forRoot()', () => {
    const MockProvider = class {
      readonly name = 'mock';
      async complete() { return { content: '', model: 'mock', provider: 'mock', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop' as const }; }
      stream() { return new ReadableStream(); }
      countTokens() { return 0; }
    };

    AiModule.forRoot({
      providers: [{ name: 'mock', provider: MockProvider as never, config: {}, default: true }],
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, AiModule);
    expect(metadata).toBeDefined();
    expect(metadata.providers.length).toBeGreaterThan(0);
    expect(metadata.exports).toContain(AI_SERVICE_TOKEN);
    expect(metadata.exports).toContain(AI_TOOL_REGISTRY_TOKEN);
  });

  test('reset() should clear module metadata', () => {
    const MockProvider = class {
      readonly name = 'mock';
      async complete() { return { content: '', model: 'mock', provider: 'mock', usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 }, finishReason: 'stop' as const }; }
      stream() { return new ReadableStream(); }
      countTokens() { return 0; }
    };

    AiModule.forRoot({
      providers: [{ name: 'mock', provider: MockProvider as never, config: {}, default: true }],
    });

    AiModule.reset();
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, AiModule);
    expect(metadata).toBeUndefined();
  });
});
