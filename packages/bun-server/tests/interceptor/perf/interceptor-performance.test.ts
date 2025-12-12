import { describe, expect, test } from 'bun:test';
import 'reflect-metadata';

import { PerformanceHarness } from '../../../src/testing/harness';
import { InterceptorRegistry } from '../../../src/interceptor/interceptor-registry';
import { InterceptorChain } from '../../../src/interceptor/interceptor-chain';
import type { Interceptor } from '../../../src/interceptor/types';
import type { Container } from '../../../src/di/container';
import type { Context } from '../../../src/core/context';
import { Container as DIContainer } from '../../../src/di/container';

/**
 * 简单的无操作拦截器，用于性能测试
 */
class NoOpInterceptor implements Interceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

/**
 * 简单的同步拦截器，用于性能测试
 */
class SyncInterceptor implements Interceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    // 简单的同步操作
    const _ = propertyKey.toString();
    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

/**
 * 测试目标类
 */
class TestTarget {
  public value = 0;

  public async method(arg: number): Promise<number> {
    this.value += arg;
    return this.value;
  }

  public syncMethod(arg: number): number {
    this.value += arg;
    return this.value;
  }
}

describe('Interceptor Performance', () => {
  const container = new DIContainer();
  const registry = new InterceptorRegistry();
  const metadataKey = Symbol('test');

  describe('Single Interceptor Performance', () => {
    test('should benchmark single interceptor execution', async () => {
      const interceptor = new NoOpInterceptor();
      const target = new TestTarget();
      const originalMethod = target.method.bind(target);

      const result = await PerformanceHarness.benchmark(
        'single-interceptor',
        10000,
        async () => {
          await interceptor.execute(
            target,
            'method',
            originalMethod,
            [1],
            container,
          );
        },
      );

      expect(result.iterations).toBe(10000);
      expect(result.opsPerSecond).toBeGreaterThan(1000);
      expect(result.durationMs).toBeLessThan(10000);

      console.log(`Single Interceptor: ${result.opsPerSecond.toFixed(2)} ops/sec`);
    });

    test('should benchmark interceptor chain with 1 interceptor', async () => {
      const interceptor = new NoOpInterceptor();
      const target = new TestTarget();
      const originalMethod = target.method.bind(target);

      const result = await PerformanceHarness.benchmark(
        'chain-1-interceptor',
        10000,
        async () => {
          await InterceptorChain.execute(
            [interceptor],
            target,
            'method',
            originalMethod,
            [1],
            container,
          );
        },
      );

      expect(result.iterations).toBe(10000);
      expect(result.opsPerSecond).toBeGreaterThan(1000);
      expect(result.durationMs).toBeLessThan(10000);

      console.log(`Chain (1 interceptor): ${result.opsPerSecond.toFixed(2)} ops/sec`);
    });
  });

  describe('Interceptor Chain Performance', () => {
    test('should benchmark interceptor chain with 3 interceptors', async () => {
      const interceptors = [
        new NoOpInterceptor(),
        new NoOpInterceptor(),
        new NoOpInterceptor(),
      ];
      const target = new TestTarget();
      const originalMethod = target.method.bind(target);

      const result = await PerformanceHarness.benchmark(
        'chain-3-interceptors',
        10000,
        async () => {
          await InterceptorChain.execute(
            interceptors,
            target,
            'method',
            originalMethod,
            [1],
            container,
          );
        },
      );

      expect(result.iterations).toBe(10000);
      expect(result.opsPerSecond).toBeGreaterThan(500);
      expect(result.durationMs).toBeLessThan(20000);

      console.log(`Chain (3 interceptors): ${result.opsPerSecond.toFixed(2)} ops/sec`);
    });

    test('should benchmark interceptor chain with 5 interceptors', async () => {
      const interceptors = Array.from({ length: 5 }, () => new NoOpInterceptor());
      const target = new TestTarget();
      const originalMethod = target.method.bind(target);

      const result = await PerformanceHarness.benchmark(
        'chain-5-interceptors',
        10000,
        async () => {
          await InterceptorChain.execute(
            interceptors,
            target,
            'method',
            originalMethod,
            [1],
            container,
          );
        },
      );

      expect(result.iterations).toBe(10000);
      expect(result.opsPerSecond).toBeGreaterThan(300);
      expect(result.durationMs).toBeLessThan(35000);

      console.log(`Chain (5 interceptors): ${result.opsPerSecond.toFixed(2)} ops/sec`);
    });

    test('should benchmark interceptor chain with 10 interceptors', async () => {
      const interceptors = Array.from({ length: 10 }, () => new NoOpInterceptor());
      const target = new TestTarget();
      const originalMethod = target.method.bind(target);

      const result = await PerformanceHarness.benchmark(
        'chain-10-interceptors',
        10000,
        async () => {
          await InterceptorChain.execute(
            interceptors,
            target,
            'method',
            originalMethod,
            [1],
            container,
          );
        },
      );

      expect(result.iterations).toBe(10000);
      expect(result.opsPerSecond).toBeGreaterThan(200);
      expect(result.durationMs).toBeLessThan(50000);

      console.log(`Chain (10 interceptors): ${result.opsPerSecond.toFixed(2)} ops/sec`);
    });
  });

  describe('Performance Comparison', () => {
    test('should compare direct method call vs interceptor chain', async () => {
      const target = new TestTarget();
      const originalMethod = target.method.bind(target);
      const interceptors = [new NoOpInterceptor()];

      // 直接方法调用
      const directResult = await PerformanceHarness.benchmark(
        'direct-method-call',
        10000,
        async () => {
          await originalMethod(1);
        },
      );

      // 拦截器链调用
      const interceptorResult = await PerformanceHarness.benchmark(
        'interceptor-chain',
        10000,
        async () => {
          await InterceptorChain.execute(
            interceptors,
            target,
            'method',
            originalMethod,
            [1],
            container,
          );
        },
      );

      expect(directResult.iterations).toBe(10000);
      expect(interceptorResult.iterations).toBe(10000);

      const overhead = (interceptorResult.durationMs / directResult.durationMs - 1) * 100;

      console.log(`Direct call: ${directResult.opsPerSecond.toFixed(2)} ops/sec`);
      console.log(`Interceptor chain: ${interceptorResult.opsPerSecond.toFixed(2)} ops/sec`);
      console.log(`Overhead: ${overhead.toFixed(2)}%`);

      // 拦截器开销应该小于 400%（即不超过 5 倍）
      // 实际测试显示开销约为 275%，这是合理的，因为需要额外的函数调用和参数传递
      expect(overhead).toBeLessThan(400);
    });

    test('should compare sync method call vs interceptor chain', async () => {
      const target = new TestTarget();
      const originalMethod = target.syncMethod.bind(target);
      const interceptors = [new SyncInterceptor()];

      // 直接方法调用
      const directResult = await PerformanceHarness.benchmark(
        'direct-sync-call',
        100000,
        async () => {
          originalMethod(1);
        },
      );

      // 拦截器链调用
      const interceptorResult = await PerformanceHarness.benchmark(
        'interceptor-sync-chain',
        100000,
        async () => {
          await InterceptorChain.execute(
            interceptors,
            target,
            'syncMethod',
            originalMethod,
            [1],
            container,
          );
        },
      );

      expect(directResult.iterations).toBe(100000);
      expect(interceptorResult.iterations).toBe(100000);

      const overhead = (interceptorResult.durationMs / directResult.durationMs - 1) * 100;

      console.log(`Direct sync call: ${directResult.opsPerSecond.toFixed(2)} ops/sec`);
      console.log(`Interceptor sync chain: ${interceptorResult.opsPerSecond.toFixed(2)} ops/sec`);
      console.log(`Overhead: ${overhead.toFixed(2)}%`);

      // 拦截器开销应该小于 1000%（即不超过 11 倍）
      // 同步方法转换为异步会有额外开销，实际测试显示开销约为 656-870%
      // 性能测试结果可能有波动，使用更宽松的阈值以确保测试稳定性
      expect(overhead).toBeLessThan(1000);
    });
  });

  describe('Registry Performance', () => {
    test('should benchmark interceptor registry operations', async () => {
      const result = await PerformanceHarness.benchmark(
        'registry-register',
        10000,
        async (iteration) => {
          const key = Symbol(`test-${iteration}`);
          registry.register(key, new NoOpInterceptor(), 100);
        },
      );

      expect(result.iterations).toBe(10000);
      expect(result.opsPerSecond).toBeGreaterThan(1000);

      console.log(`Registry register: ${result.opsPerSecond.toFixed(2)} ops/sec`);
    });

    test('should benchmark interceptor registry lookup', async () => {
      // 预先注册一些拦截器
      const keys = Array.from({ length: 100 }, (_, i) => Symbol(`key-${i}`));
      for (const key of keys) {
        registry.register(key, new NoOpInterceptor(), 100);
      }

      const result = await PerformanceHarness.benchmark(
        'registry-lookup',
        10000,
        async (iteration) => {
          const key = keys[iteration % keys.length];
          registry.getInterceptors(key);
        },
      );

      expect(result.iterations).toBe(10000);
      expect(result.opsPerSecond).toBeGreaterThan(5000);

      console.log(`Registry lookup: ${result.opsPerSecond.toFixed(2)} ops/sec`);
    });
  });
});

