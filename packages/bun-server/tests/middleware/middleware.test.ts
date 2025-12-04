import 'reflect-metadata';
import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import { Application } from '../../src/core/application';
import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { GET, POST } from '../../src/router/decorators';
import { UseMiddleware } from '../../src/middleware';
import type { Middleware } from '../../src/middleware';
import { RouteRegistry } from '../../src/router/registry';
import { Body } from '../../src/controller/decorators';
import { getTestPort } from '../utils/test-port';

describe('Middleware Integration', () => {
  let app: Application;
  let port: number;

  beforeEach(() => {
    port = getTestPort();
    app = new Application({ port });
  });

  afterEach(() => {
    app.stop();
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
  });

  test('should apply global middleware', async () => {
    const headerMiddleware: Middleware = async (ctx, next) => {
      ctx.setHeader('x-global-middleware', 'enabled');
      return await next();
    };

    app.use(headerMiddleware);

    @Controller('/api/middleware/global')
    class GlobalController {
      @GET('/')
      public getData() {
        return { ok: true };
      }
    }

    app.registerController(GlobalController);
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/middleware/global`);
    expect(response.headers.get('x-global-middleware')).toBe('enabled');
    const data = await response.json();
    expect(data).toEqual({ ok: true });
  });

  test('should apply class and method level middleware', async () => {
    const calls: string[] = [];

    const classMiddleware: Middleware = async (ctx, next) => {
      calls.push('class');
      return await next();
    };

    const methodMiddleware: Middleware = async (ctx, next) => {
      calls.push('method');
      return await next();
    };

    @UseMiddleware(classMiddleware)
    @Controller('/api/middleware/controller')
    class ControllerWithMiddleware {
      @UseMiddleware(methodMiddleware)
      @GET('/')
      public getData() {
        calls.push('handler');
        return { value: 'ok' };
      }
    }

    app.registerController(ControllerWithMiddleware);
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/middleware/controller`);
    const data = await response.json();

    expect(data).toEqual({ value: 'ok' });
    expect(calls).toEqual(['class', 'method', 'handler']);
  });

  test('should allow middleware to short-circuit request', async () => {
    const guard: Middleware = async () => {
      return new Response(JSON.stringify({ blocked: true }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    app.use(guard);

    @Controller('/api/middleware/blocked')
    class BlockedController {
      @POST('/')
      public createUser(@Body() user: { name: string }) {
        return { id: '1', ...user };
      }
    }

    app.registerController(BlockedController);
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/middleware/blocked`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John' }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data).toEqual({ blocked: true });
  });
});


