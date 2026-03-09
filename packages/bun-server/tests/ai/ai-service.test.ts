import { describe, expect, test } from 'bun:test';
import { AiService } from '../../src/ai/service';
import type { LlmProvider, AiRequest, AiResponse } from '../../src/ai/types';
import { AiNoProviderError, AiAllProvidersFailed } from '../../src/ai/errors';

function makeMockProviderClass(name: string, shouldFail = false): new (c: unknown) => LlmProvider {
  return class {
    readonly name: string = name;
    async complete(_req: AiRequest): Promise<AiResponse> {
      if (shouldFail) throw new Error(`${name} failed`);
      return {
        content: `Hello from ${name}`,
        model: 'mock-model',
        provider: name,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: 'stop',
      };
    }
    stream(_req: AiRequest): ReadableStream<Uint8Array> {
      return new ReadableStream();
    }
    countTokens() { return 10; }
  } as never;
}

describe('AiService', () => {
  test('should complete with default provider', async () => {
    const service = new AiService({
      providers: [{ name: 'mock', provider: makeMockProviderClass('mock'), config: {}, default: true }],
    } as never);
    const result = await service.complete({ messages: [{ role: 'user', content: 'Hello' }] });
    expect(result.content).toBe('Hello from mock');
    expect(result.provider).toBe('mock');
  });

  test('should use named provider when specified', async () => {
    const service = new AiService({
      providers: [
        { name: 'provider-a', provider: makeMockProviderClass('provider-a'), config: {}, default: true },
        { name: 'provider-b', provider: makeMockProviderClass('provider-b'), config: {} },
      ],
    } as never);
    const result = await service.complete({ messages: [{ role: 'user', content: 'Hi' }], provider: 'provider-b' });
    expect(result.provider).toBe('provider-b');
  });

  test('should throw AiNoProviderError when no providers configured', () => {
    const service = new AiService({ providers: [] } as never);
    expect(() => service.getProvider()).toThrow(AiNoProviderError);
  });

  test('should list provider names', () => {
    const service = new AiService({
      providers: [
        { name: 'a', provider: makeMockProviderClass('a'), config: {}, default: true },
        { name: 'b', provider: makeMockProviderClass('b'), config: {} },
      ],
    } as never);
    expect(service.getProviderNames()).toEqual(['a', 'b']);
  });

  test('should fallback to secondary provider on primary failure', async () => {
    const service = new AiService({
      providers: [
        { name: 'failing', provider: makeMockProviderClass('failing', true), config: {}, default: true },
        { name: 'backup', provider: makeMockProviderClass('backup'), config: {} },
      ],
      fallback: true,
      timeout: 5000,
    } as never);
    const result = await service.complete({ messages: [{ role: 'user', content: 'Hi' }] });
    expect(result.provider).toBe('backup');
  });

  test('should throw AiAllProvidersFailed when all fallbacks fail', async () => {
    const service = new AiService({
      providers: [{ name: 'failing', provider: makeMockProviderClass('failing', true), config: {}, default: true }],
      fallback: true,
      timeout: 5000,
    } as never);
    expect(service.complete({ messages: [{ role: 'user', content: 'Hi' }] })).rejects.toBeInstanceOf(AiAllProvidersFailed);
  });

  test('should count tokens with default provider', () => {
    const service = new AiService({
      providers: [{ name: 'mock', provider: makeMockProviderClass('mock'), config: {}, default: true }],
    } as never);
    const count = service.countTokens([{ role: 'user', content: 'Hello world' }]);
    expect(count).toBeGreaterThan(0);
  });
});
