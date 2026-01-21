import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { MiddlewarePipeline, runMiddlewares } from '../../src/middleware/pipeline';
import { Context } from '../../src/core/context';
import { Container } from '../../src/di/container';
import type { Middleware } from '../../src/middleware';

describe('MiddlewarePipeline', () => {
  let pipeline: MiddlewarePipeline;
  let context: Context;

  beforeEach(() => {
    pipeline = new MiddlewarePipeline();
    const request = new Request('http://localhost/test');
    context = new Context(request, new Container());
  });

  describe('constructor', () => {
    test('should create empty pipeline', () => {
      const p = new MiddlewarePipeline();
      expect(p.hasMiddlewares()).toBe(false);
    });

    test('should create pipeline with initial middlewares', () => {
      const middleware: Middleware = async (ctx, next) => next();
      const p = new MiddlewarePipeline([middleware]);
      expect(p.hasMiddlewares()).toBe(true);
    });
  });

  describe('use', () => {
    test('should add middleware', () => {
      expect(pipeline.hasMiddlewares()).toBe(false);

      pipeline.use(async (ctx, next) => next());

      expect(pipeline.hasMiddlewares()).toBe(true);
    });
  });

  describe('clear', () => {
    test('should remove all middlewares', () => {
      pipeline.use(async (ctx, next) => next());
      pipeline.use(async (ctx, next) => next());

      pipeline.clear();

      expect(pipeline.hasMiddlewares()).toBe(false);
    });
  });

  describe('run', () => {
    test('should run final handler when no middlewares', async () => {
      let finalCalled = false;
      const response = await pipeline.run(context, async () => {
        finalCalled = true;
        return new Response('final');
      });

      expect(finalCalled).toBe(true);
      expect(await response.text()).toBe('final');
    });

    test('should execute middlewares in order', async () => {
      const order: number[] = [];

      pipeline.use(async (ctx, next) => {
        order.push(1);
        const res = await next();
        order.push(4);
        return res;
      });

      pipeline.use(async (ctx, next) => {
        order.push(2);
        const res = await next();
        order.push(3);
        return res;
      });

      await pipeline.run(context, async () => new Response('ok'));

      expect(order).toEqual([1, 2, 3, 4]);
    });

    test('should allow middleware to modify response', async () => {
      pipeline.use(async (ctx, next) => {
        const res = await next();
        return new Response('modified', { headers: res.headers });
      });

      const response = await pipeline.run(context, async () => new Response('original'));

      expect(await response.text()).toBe('modified');
    });

    test('should allow middleware to short-circuit', async () => {
      let finalCalled = false;

      pipeline.use(async (ctx, next) => {
        return new Response('short-circuit');
      });

      const response = await pipeline.run(context, async () => {
        finalCalled = true;
        return new Response('final');
      });

      expect(finalCalled).toBe(false);
      expect(await response.text()).toBe('short-circuit');
    });

    test('should track middleware calls', async () => {
      let nextCallCount = 0;

      pipeline.use(async (ctx, next) => {
        nextCallCount++;
        return await next();
      });

      await pipeline.run(context, async () => new Response('ok'));

      expect(nextCallCount).toBe(1);
    });
  });
});

describe('runMiddlewares', () => {
  let context: Context;

  beforeEach(() => {
    const request = new Request('http://localhost/test');
    context = new Context(request, new Container());
  });

  test('should run final handler when no middlewares', async () => {
    const response = await runMiddlewares([], context, async () => new Response('final'));
    expect(await response.text()).toBe('final');
  });

  test('should execute middlewares', async () => {
    const order: number[] = [];

    const middlewares: Middleware[] = [
      async (ctx, next) => {
        order.push(1);
        return await next();
      },
      async (ctx, next) => {
        order.push(2);
        return await next();
      },
    ];

    await runMiddlewares(middlewares, context, async () => new Response('ok'));

    expect(order).toEqual([1, 2]);
  });
});
