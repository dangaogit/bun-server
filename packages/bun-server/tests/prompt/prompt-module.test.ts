import { describe, expect, test, beforeEach } from 'bun:test';
import { PromptModule } from '../../src/prompt/prompt-module';
import { PROMPT_SERVICE_TOKEN } from '../../src/prompt/types';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('PromptModule', () => {
  beforeEach(() => {
    PromptModule.reset();
  });

  test('should register providers on forRoot()', () => {
    PromptModule.forRoot();
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, PromptModule);
    expect(metadata).toBeDefined();
    expect(metadata.exports).toContain(PROMPT_SERVICE_TOKEN);
  });

  test('should use InMemoryPromptStore by default', () => {
    PromptModule.forRoot();
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, PromptModule);
    expect(metadata.providers.length).toBeGreaterThan(0);
  });

  test('reset() should clear module metadata', () => {
    PromptModule.forRoot();
    PromptModule.reset();
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, PromptModule);
    expect(metadata).toBeUndefined();
  });
});
