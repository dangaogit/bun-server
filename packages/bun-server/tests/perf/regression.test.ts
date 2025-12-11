import { describe, expect, test } from 'bun:test';
import { Application } from '../../src/core/application';
import { RouteRegistry } from '../../src/router/registry';
import { Context } from '../../src/core/context';
import { PerformanceHarness } from '../../src/testing/harness';
import { getTestPort } from '../utils/test-port';

/**
 * 性能回归测试
 * 确保关键路径的性能不会退化
 */
describe('Performance Regression Tests', () => {
  test('router handle should be fast', async () => {
    const registry = RouteRegistry.getInstance();
    registry.get('/api/test', (ctx: Context) => {
      return ctx.createResponse({ message: 'ok' });
    });

    const router = registry.getRouter();
    const context = new Context(
      new Request('http://localhost:3000/api/test'),
    );
    context.params = {};

    const result = await PerformanceHarness.benchmark(
      'router handle',
      1000,
      async () => {
        await router.preHandle(context);
        return await router.handle(context);
      },
    );

    // 路由处理应该快速完成
    expect(result.durationMs).toBeLessThan(1000); // 1000次操作应该在1秒内完成
    expect(result.opsPerSecond).toBeGreaterThan(1000);
  });

  test('application request handling should be fast', async () => {
    const port = getTestPort();
    const app = new Application({ port });
    const registry = RouteRegistry.getInstance();
    registry.get('/api/ping', (ctx: Context) => {
      return ctx.createResponse({ status: 'ok' });
    });

    await app.listen();

    try {
      const result = await PerformanceHarness.benchmark(
        'application request',
        100,
        async () => {
          const response = await fetch(`http://localhost:${port}/api/ping`);
          await response.text();
          return response;
        },
      );

      // HTTP 请求处理应该快速完成（包含网络开销）
      expect(result.durationMs).toBeLessThan(2000); // 100次请求应该在2秒内完成
      expect(result.opsPerSecond).toBeGreaterThan(50);
    } finally {
      await app.stop();
    }
  });

  test('DI container resolve should be fast', async () => {
    const { Container } = await import('../../src/di/container');
    const { Injectable } = await import('../../src/di/decorators');

    @Injectable()
    class TestService {
      public value = 'test';
    }

    const container = new Container();
    container.register(TestService);

    const result = await PerformanceHarness.benchmark(
      'DI resolve',
      10000,
      () => {
        return container.resolve(TestService);
      },
    );

    // DI 解析应该非常快（单例缓存）
    expect(result.durationMs).toBeLessThan(100); // 10000次解析应该在100ms内完成
    expect(result.opsPerSecond).toBeGreaterThan(10000);
  });

  test('middleware pipeline should be fast', async () => {
    const { MiddlewarePipeline } = await import('../../src/middleware/pipeline');
    const { Context } = await import('../../src/core/context');

    const pipeline = new MiddlewarePipeline();
    pipeline.use(async (ctx, next) => {
      return await next();
    });
    pipeline.use(async (ctx, next) => {
      return await next();
    });

    const context = new Context(new Request('http://localhost:3000/test'));
    const result = await PerformanceHarness.benchmark(
      'middleware pipeline',
      1000,
      async () => {
        return await pipeline.run(context, async () => {
          return new Response('ok');
        });
      },
    );

    // 中间件管道应该快速完成
    expect(result.durationMs).toBeLessThan(500); // 1000次操作应该在500ms内完成
    expect(result.opsPerSecond).toBeGreaterThan(1000);
  });
});
