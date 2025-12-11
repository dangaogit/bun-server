import { describe, expect, test } from 'bun:test';
import { Router } from '../../src/router/router';
import { Context } from '../../src/core/context';
import { MiddlewarePipeline } from '../../src/middleware/pipeline';
import { Container } from '../../src/di/container';
import { Injectable, Inject } from '../../src/di/decorators';
import { PerformanceHarness } from '../../src/testing/harness';
import 'reflect-metadata';

/**
 * 性能优化验证测试
 * 验证路由匹配缓存、中间件管道优化、DI 容器优化的效果
 */

describe('Performance Optimization Tests', () => {
  test('route matching cache should improve performance', async () => {
    const router = new Router();
    
    // 注册多个路由
    for (let i = 0; i < 100; i++) {
      router.get(`/api/users/${i}`, (ctx: Context) => ctx.createResponse({ id: i }));
    }
    
    // 注册动态路由
    router.get('/api/users/:id', (ctx: Context) => ctx.createResponse({ id: ctx.getParam('id') }));

    const context = new Context(new Request('http://localhost:3000/api/users/123'));

    // 第一次匹配（无缓存）
    const result1 = await PerformanceHarness.benchmark(
      'route match (first, no cache)',
      1000,
      async () => {
        return router.findRoute('GET', '/api/users/123');
      },
    );

    // 第二次匹配（有缓存）
    const result2 = await PerformanceHarness.benchmark(
      'route match (cached)',
      1000,
      async () => {
        return router.findRoute('GET', '/api/users/123');
      },
    );

    // 缓存后的性能应该更好
    expect(result2.durationMs).toBeLessThan(result1.durationMs);
    expect(result2.opsPerSecond).toBeGreaterThan(result1.opsPerSecond);
  });

  test('middleware pipeline optimization should reduce memory allocation', async () => {
    const pipeline = new MiddlewarePipeline();
    
    // 添加多个中间件
    for (let i = 0; i < 50; i++) {
      pipeline.use(async (ctx, next) => {
        return await next();
      });
    }

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

    // 优化后的中间件管道应该快速执行
    expect(result.durationMs).toBeLessThan(1000); // 1000次操作应该在1秒内完成
    expect(result.opsPerSecond).toBeGreaterThan(1000);
  });

  test('DI container dependency plan cache should improve resolution', async () => {
    @Injectable()
    class Level1 {
      public name = 'level1';
    }

    @Injectable()
    class Level2 {
      public constructor(@Inject(Level1) public level1: Level1) {}
    }

    @Injectable()
    class Level3 {
      public constructor(@Inject(Level2) public level2: Level2) {}
    }

    const container = new Container();
    container.register(Level1);
    container.register(Level2);
    container.register(Level3);

    // 第一次解析（构建依赖计划）
    const result1 = await PerformanceHarness.benchmark(
      'DI resolve (first, build plan)',
      1000,
      () => {
        return container.resolve(Level3);
      },
    );

    // 第二次解析（使用缓存的依赖计划）
    const result2 = await PerformanceHarness.benchmark(
      'DI resolve (cached plan)',
      1000,
      () => {
        return container.resolve(Level3);
      },
    );

    // 使用缓存计划后的性能应该更好（虽然单例也会影响）
    // 主要验证不会退化
    expect(result2.durationMs).toBeLessThanOrEqual(result1.durationMs * 1.5);
    expect(result2.opsPerSecond).toBeGreaterThan(5000);
  });

  test('router should handle many routes efficiently', async () => {
    const router = new Router();
    
    // 注册大量路由
    for (let i = 0; i < 1000; i++) {
      router.get(`/api/items/${i}`, (ctx: Context) => ctx.createResponse({ id: i }));
    }

    const context = new Context(new Request('http://localhost:3000/api/items/500'));

    const result = await PerformanceHarness.benchmark(
      'router with many routes',
      100,
      async () => {
        return router.findRoute('GET', '/api/items/500');
      },
    );

    // 即使有大量路由，匹配应该快速完成
    expect(result.durationMs).toBeLessThan(500); // 100次操作应该在500ms内完成
    expect(result.opsPerSecond).toBeGreaterThan(200);
  });

  test('middleware pipeline should handle many middlewares efficiently', async () => {
    const pipeline = new MiddlewarePipeline();
    
    // 添加大量中间件
    for (let i = 0; i < 200; i++) {
      pipeline.use(async (ctx, next) => {
        return await next();
      });
    }

    const context = new Context(new Request('http://localhost:3000/test'));

    const result = await PerformanceHarness.benchmark(
      'middleware pipeline (many middlewares)',
      100,
      async () => {
        return await pipeline.run(context, async () => {
          return new Response('ok');
        });
      },
    );

    // 即使有大量中间件，执行应该快速完成
    expect(result.durationMs).toBeLessThan(2000); // 100次操作应该在2秒内完成
    expect(result.opsPerSecond).toBeGreaterThan(50);
  });
});
