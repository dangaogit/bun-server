import { describe, expect, test } from 'bun:test';

import { MiddlewarePipeline } from '../../src/middleware/pipeline';
import type { Middleware } from '../../src/middleware';
import { Context } from '../../src/core/context';

function createContext(): Context {
  const request = new Request('http://localhost:3000/api/test');
  return new Context(request);
}

describe('MiddlewarePipeline', () => {
  test('should execute middlewares in order and call final handler', async () => {
    const pipeline = new MiddlewarePipeline();
    const calls: string[] = [];

    const first: Middleware = async (ctx, next) => {
      calls.push('first:before');
      const response = await next();
      calls.push('first:after');
      return response;
    };

    const second: Middleware = async (ctx, next) => {
      calls.push('second:before');
      const response = await next();
      calls.push('second:after');
      return response;
    };

    pipeline.use(first);
    pipeline.use(second);

    const context = createContext();
    const response = await pipeline.run(context, async () => {
      calls.push('handler');
      return context.createResponse({ ok: true });
    });

    const data = await response.json();
    expect(data).toEqual({ ok: true });
    expect(calls).toEqual([
      'first:before',
      'second:before',
      'handler',
      'second:after',
      'first:after',
    ]);
  });

  test('should allow middleware to short circuit the pipeline', async () => {
    const pipeline = new MiddlewarePipeline();

    const blocker: Middleware = async (ctx) => {
      ctx.setStatus(401);
      return ctx.createResponse({ error: 'Unauthorized' });
    };

    pipeline.use(blocker);

    const context = createContext();
    const response = await pipeline.run(context, async () => {
      return context.createResponse({ ok: true });
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ error: 'Unauthorized' });
  });
});


