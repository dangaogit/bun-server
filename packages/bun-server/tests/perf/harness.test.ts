import { describe, expect, test } from 'bun:test';

import { PerformanceHarness, StressTester } from '../../src/testing/harness';
import { Router } from '../../src/router/router';
import { Context } from '../../src/core/context';

describe('PerformanceHarness', () => {
  test('should produce benchmark metrics', async () => {
    let total = 0;
    const result = await PerformanceHarness.benchmark('increment', 50, () => {
      total += 1;
    });

    expect(result.name).toBe('increment');
    expect(result.iterations).toBe(50);
    expect(result.opsPerSecond).toBeGreaterThan(0);
    expect(total).toBe(50);
  });

  test('should benchmark router lookups', async () => {
    const router = new Router();
    for (let i = 0; i < 100; i++) {
      router.get(`/static/${i}`, (ctx: Context) => ctx.createResponse({ i }));
    }

    const result = await PerformanceHarness.benchmark('router:static', 200, (iteration) => {
      const index = iteration % 100;
      const route = router.findRoute('GET', `/static/${index}`);
      expect(route).toBeDefined();
    });

    expect(result.opsPerSecond).toBeGreaterThan(0);
  });
});

describe('StressTester', () => {
  test('should execute tasks concurrently', async () => {
    let executed = 0;
    const result = await StressTester.run('stress:noop', 40, 5, async () => {
      executed += 1;
    });

    expect(result.iterations).toBe(40);
    expect(result.errors).toBe(0);
    expect(executed).toBe(40);
  });
});

