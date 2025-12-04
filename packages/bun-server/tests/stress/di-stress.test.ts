import { describe, expect, test } from 'bun:test';

import { StressTester } from '../../src/testing/harness';
import { Container } from '../../src/di/container';
import { Injectable } from '../../src/di/decorators';

describe('DI Stress', () => {
  test('should resolve services under concurrent stress', async () => {
    const container = new Container();

    @Injectable()
    class HeavyService {
      public readonly createdAt = Date.now();
      public getValue() {
        return 'heavy';
      }
    }

    container.register(HeavyService);

    const result = await StressTester.run('di:resolve', 60, 6, async () => {
      const service = container.resolve(HeavyService);
      expect(service.getValue()).toBe('heavy');
    });

    expect(result.errors).toBe(0);
    expect(result.iterations).toBe(60);
  });
});

