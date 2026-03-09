import { describe, expect, test, beforeEach } from 'bun:test';
import { AiGuardModule } from '../../src/ai-guard/ai-guard-module';
import { AI_GUARD_SERVICE_TOKEN } from '../../src/ai-guard/types';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('AiGuardModule', () => {
  beforeEach(() => {
    AiGuardModule.reset();
  });

  test('should register providers on forRoot()', () => {
    AiGuardModule.forRoot({ piiDetection: true });
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, AiGuardModule);
    expect(metadata).toBeDefined();
    expect(metadata.exports).toContain(AI_GUARD_SERVICE_TOKEN);
  });

  test('reset() clears metadata', () => {
    AiGuardModule.forRoot({});
    AiGuardModule.reset();
    expect(Reflect.getMetadata(MODULE_METADATA_KEY, AiGuardModule)).toBeUndefined();
  });
});
