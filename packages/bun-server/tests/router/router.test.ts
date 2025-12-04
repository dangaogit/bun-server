import { describe, expect, test, beforeEach } from 'bun:test';
import { Router } from '../../src/router/router';
import { Context } from '../../src/core/context';

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  test('should register route', () => {
    const handler = (ctx: Context) => ctx.createResponse({});
    router.register('GET', '/api/users', handler);

    const routes = router.getRoutes();
    expect(routes.length).toBe(1);
  });

  test('should register GET route', () => {
    const handler = (ctx: Context) => ctx.createResponse({});
    router.get('/api/users', handler);

    const route = router.findRoute('GET', '/api/users');
    expect(route).toBeDefined();
  });

  test('should register POST route', () => {
    const handler = (ctx: Context) => ctx.createResponse({});
    router.post('/api/users', handler);

    const route = router.findRoute('POST', '/api/users');
    expect(route).toBeDefined();
  });

  test('should find route by method and path', () => {
    const handler = (ctx: Context) => ctx.createResponse({});
    router.get('/api/users', handler);

    const route = router.findRoute('GET', '/api/users');
    expect(route).toBeDefined();
    expect(route?.method).toBe('GET');
    expect(route?.path).toBe('/api/users');
  });

  test('should not find non-existent route', () => {
    const route = router.findRoute('GET', '/api/users');
    expect(route).toBeUndefined();
  });

  test('should handle request', async () => {
    const handler = (ctx: Context) => ctx.createResponse({ message: 'Hello' });
    router.get('/api/users', handler);

    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    const response = await router.handle(context);
    expect(response).toBeDefined();
    
    if (response) {
      const data = await response.json();
      expect(data.message).toBe('Hello');
    }
  });

  test('should return undefined for non-existent route', async () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    const response = await router.handle(context);
    expect(response).toBeUndefined();
  });

  test('should extract path parameters', async () => {
    const handler = (ctx: Context) => {
      return ctx.createResponse({ id: ctx.getParam('id') });
    };
    router.get('/api/users/:id', handler);

    const request = new Request('http://localhost:3000/api/users/123');
    const context = new Context(request);

    const response = await router.handle(context);
    expect(response).toBeDefined();
    
    if (response) {
      const data = await response.json();
      expect(data.id).toBe('123');
    }
  });

  test('should handle multiple routes', () => {
    const handler1 = (ctx: Context) => ctx.createResponse({});
    const handler2 = (ctx: Context) => ctx.createResponse({});
    
    router.get('/api/users', handler1);
    router.post('/api/users', handler2);

    const getRoute = router.findRoute('GET', '/api/users');
    const postRoute = router.findRoute('POST', '/api/users');

    expect(getRoute).toBeDefined();
    expect(postRoute).toBeDefined();
    expect(getRoute?.method).toBe('GET');
    expect(postRoute?.method).toBe('POST');
  });

  test('should cache static routes for faster lookup', () => {
    const handler = (ctx: Context) => ctx.createResponse({});
    router.get('/static/path', handler);

    const internalMap = (router as unknown as { staticRoutes: Map<string, unknown> }).staticRoutes;
    expect(internalMap.size).toBe(1);
    expect(router.findRoute('GET', '/static/path')).toBeDefined();

    // dynamic route should still work via fallback iteration
    router.get('/api/items/:id', handler);
    expect(router.findRoute('GET', '/api/items/1')).toBeDefined();
  });

  test('should clear registered routes and caches', () => {
    router.get('/cache/test', (ctx: Context) => ctx.createResponse({}));
    expect(router.getRoutes().length).toBe(1);

    router.clear();
    expect(router.getRoutes().length).toBe(0);
    const internalMap = (router as unknown as { staticRoutes: Map<string, unknown> }).staticRoutes;
    expect(internalMap.size).toBe(0);
    expect(router.findRoute('GET', '/cache/test')).toBeUndefined();
  });
});

