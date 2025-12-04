import { describe, expect, test, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { RouteRegistry } from '../../src/router/registry';
import type { Context } from '../../src/core/context';
import { ControllerRegistry } from '../../src/controller/controller';
import { getTestPort } from '../utils/test-port';

describe('Application Body Parsing Integration', () => {
  let app: Application;

  afterEach(() => {
    if (app) {
      app.stop();
    }
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
  });

  test('should parse JSON body in POST request', async () => {
    const port = getTestPort();
    app = new Application({ port });
    const registry = RouteRegistry.getInstance();
    registry.post('/api/users-json', async (ctx: Context) => {
      const body = await ctx.getBody();
      return ctx.createResponse({ received: body });
    });
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users-json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John', age: 30 }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.received).toEqual({ name: 'John', age: 30 });
  });

  test('should parse URLEncoded body', async () => {
    const port = getTestPort();
    app = new Application({ port });
    const registry = RouteRegistry.getInstance();
    registry.post('/api/users-urlencoded', async (ctx: Context) => {
      const body = await ctx.getBody();
      return ctx.createResponse({ received: body });
    });
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users-urlencoded`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'name=John&age=30',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.received).toEqual({ name: 'John', age: '30' });
  });

  test('should handle empty body', async () => {
    const port = getTestPort();
    app = new Application({ port });
    const registry = RouteRegistry.getInstance();
    registry.post('/api/users-empty', async (ctx: Context) => {
      const body = await ctx.getBody();
      // 空 body 时，body 应该是 undefined
      // 返回一个简单的响应，验证 body 确实是 undefined
      return ctx.createResponse({ 
        message: 'Empty body handled',
        bodyExists: body !== undefined,
      });
    });
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users-empty`, {
      method: 'POST',
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    // 验证响应包含消息
    expect(data.message).toBe('Empty body handled');
    // 空 body 时，bodyExists 应该是 false
    expect(data.bodyExists).toBe(false);
  });
});

