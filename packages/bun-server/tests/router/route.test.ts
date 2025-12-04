import { describe, expect, test } from 'bun:test';
import { Route } from '../../src/router/route';
import { Context } from '../../src/core/context';

describe('Route', () => {
  test('should create route', () => {
    const handler = (ctx: Context) => ctx.createResponse({ message: 'Hello' });
    const route = new Route('GET', '/api/users', handler);

    expect(route.method).toBe('GET');
    expect(route.path).toBe('/api/users');
  });

  test('should match exact path', () => {
    const handler = (ctx: Context) => ctx.createResponse({});
    const route = new Route('GET', '/api/users', handler);

    const match = route.match('GET', '/api/users');
    expect(match.matched).toBe(true);
    expect(match.params).toEqual({});
  });

  test('should not match different method', () => {
    const handler = (ctx: Context) => ctx.createResponse({});
    const route = new Route('GET', '/api/users', handler);

    const match = route.match('POST', '/api/users');
    expect(match.matched).toBe(false);
  });

  test('should not match different path', () => {
    const handler = (ctx: Context) => ctx.createResponse({});
    const route = new Route('GET', '/api/users', handler);

    const match = route.match('GET', '/api/posts');
    expect(match.matched).toBe(false);
  });

  test('should match path with parameter', () => {
    const handler = (ctx: Context) => ctx.createResponse({});
    const route = new Route('GET', '/api/users/:id', handler);

    const match = route.match('GET', '/api/users/123');
    expect(match.matched).toBe(true);
    expect(match.params).toEqual({ id: '123' });
  });

  test('should match path with multiple parameters', () => {
    const handler = (ctx: Context) => ctx.createResponse({});
    const route = new Route('GET', '/api/users/:userId/posts/:postId', handler);

    const match = route.match('GET', '/api/users/123/posts/456');
    expect(match.matched).toBe(true);
    expect(match.params).toEqual({ userId: '123', postId: '456' });
  });

  test('should execute handler', async () => {
    const handler = (ctx: Context) => ctx.createResponse({ message: 'Hello' });
    const route = new Route('GET', '/api/users', handler);

    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    const response = await route.execute(context);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data.message).toBe('Hello');
  });
});

