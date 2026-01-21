import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { Router } from '../../src/router/router';
import { RouteRegistry } from '../../src/router/registry';
import { Context } from '../../src/core/context';
import { Container } from '../../src/di/container';

describe('Router', () => {
  let router: Router;

  beforeEach(() => {
    router = new Router();
  });

  describe('register', () => {
    test('should register GET route', () => {
      router.get('/users', async () => new Response('users'));
      const route = router.findRoute('GET', '/users');
      expect(route).toBeDefined();
    });

    test('should register POST route', () => {
      router.post('/users', async () => new Response('created'));
      const route = router.findRoute('POST', '/users');
      expect(route).toBeDefined();
    });

    test('should register PUT route', () => {
      router.put('/users/:id', async () => new Response('updated'));
      const route = router.findRoute('PUT', '/users/123');
      expect(route).toBeDefined();
    });

    test('should register DELETE route', () => {
      router.delete('/users/:id', async () => new Response('deleted'));
      const route = router.findRoute('DELETE', '/users/456');
      expect(route).toBeDefined();
    });

    test('should register PATCH route', () => {
      router.patch('/users/:id', async () => new Response('patched'));
      const route = router.findRoute('PATCH', '/users/789');
      expect(route).toBeDefined();
    });

    test('should normalize path by removing trailing slash', () => {
      router.get('/users/', async () => new Response('users'));
      const route = router.findRoute('GET', '/users');
      expect(route).toBeDefined();
    });

    test('should not remove trailing slash from root path', () => {
      router.get('/', async () => new Response('root'));
      const route = router.findRoute('GET', '/');
      expect(route).toBeDefined();
    });

    test('should register route with middlewares', () => {
      const middleware = async (ctx: Context, next: () => Promise<Response>) => next();
      router.get('/protected', async () => new Response('ok'), [middleware]);
      const route = router.findRoute('GET', '/protected');
      expect(route).toBeDefined();
    });

    test('should register route with controller info', () => {
      class TestController {}
      router.register('GET', '/test', async () => new Response('test'), [], TestController, 'testMethod');
      const route = router.findRoute('GET', '/test');
      expect(route?.controllerClass).toBe(TestController);
      expect(route?.methodName).toBe('testMethod');
    });
  });

  describe('findRoute', () => {
    test('should find static route', () => {
      router.get('/api/health', async () => new Response('ok'));
      const route = router.findRoute('GET', '/api/health');
      expect(route).toBeDefined();
    });

    test('should find dynamic route with params', () => {
      router.get('/users/:id', async () => new Response('user'));
      const route = router.findRoute('GET', '/users/123');
      expect(route).toBeDefined();
    });

    test('should return undefined for non-existent route', () => {
      const route = router.findRoute('GET', '/not-found');
      expect(route).toBeUndefined();
    });

    test('should return undefined for wrong method', () => {
      router.get('/users', async () => new Response('users'));
      const route = router.findRoute('POST', '/users');
      expect(route).toBeUndefined();
    });
  });

  describe('findRouteWithMatch', () => {
    test('should return route and match for static route', () => {
      router.get('/api/test', async () => new Response('test'));
      const result = router.findRouteWithMatch('GET', '/api/test');
      expect(result).toBeDefined();
      expect(result?.match.matched).toBe(true);
      expect(result?.match.params).toEqual({});
    });

    test('should return route and match with params', () => {
      router.get('/users/:id/posts/:postId', async () => new Response('post'));
      const result = router.findRouteWithMatch('GET', '/users/123/posts/456');
      expect(result).toBeDefined();
      expect(result?.match.matched).toBe(true);
      expect(result?.match.params.id).toBe('123');
      expect(result?.match.params.postId).toBe('456');
    });

    test('should cache match results', () => {
      router.get('/cached', async () => new Response('cached'));
      
      const result1 = router.findRouteWithMatch('GET', '/cached');
      const result2 = router.findRouteWithMatch('GET', '/cached');
      
      // Should return same cached result
      expect(result1).toBe(result2);
    });

    test('should clear cache when new route is registered', () => {
      router.get('/first', async () => new Response('first'));
      router.findRouteWithMatch('GET', '/first'); // Populate cache
      
      router.get('/second', async () => new Response('second'));
      
      // Cache should be cleared, so this should work
      const result = router.findRouteWithMatch('GET', '/second');
      expect(result).toBeDefined();
    });
  });

  describe('handle', () => {
    test('should handle request and return response', async () => {
      router.get('/api/data', async () => new Response('data'));
      
      const request = new Request('http://localhost/api/data');
      const context = new Context(request, new Container());
      
      const response = await router.handle(context);
      expect(response).toBeDefined();
      expect(await response?.text()).toBe('data');
    });

    test('should set params on context', async () => {
      router.get('/users/:id', async (ctx) => new Response(`User ${ctx.params.id}`));
      
      const request = new Request('http://localhost/users/42');
      const context = new Context(request, new Container());
      
      const response = await router.handle(context);
      expect(await response?.text()).toBe('User 42');
    });

    test('should return undefined for no match', async () => {
      const request = new Request('http://localhost/not-found');
      const context = new Context(request, new Container());
      
      const response = await router.handle(context);
      expect(response).toBeUndefined();
    });

    test('should set routeHandler on context', async () => {
      class MyController {}
      router.register('GET', '/test', async () => new Response('test'), [], MyController, 'testMethod');
      
      const request = new Request('http://localhost/test');
      const context = new Context(request, new Container());
      
      await router.handle(context);
      expect((context as any).routeHandler).toBeDefined();
      expect((context as any).routeHandler.controller).toBe(MyController);
      expect((context as any).routeHandler.method).toBe('testMethod');
    });
  });

  describe('preHandle', () => {
    test('should set params without executing handler', async () => {
      let handlerCalled = false;
      router.get('/users/:id', async () => {
        handlerCalled = true;
        return new Response('user');
      });
      
      const request = new Request('http://localhost/users/123');
      const context = new Context(request, new Container());
      
      await router.preHandle(context);
      
      expect(context.params.id).toBe('123');
      expect(handlerCalled).toBe(false);
    });

    test('should set routeHandler on context', async () => {
      class TestController {}
      router.register('GET', '/api/test', async () => new Response('test'), [], TestController, 'handle');
      
      const request = new Request('http://localhost/api/test');
      const context = new Context(request, new Container());
      
      await router.preHandle(context);
      
      expect((context as any).routeHandler).toBeDefined();
      expect((context as any).routeHandler.controller).toBe(TestController);
    });

    test('should not set routeHandler for route without controller', async () => {
      router.get('/simple', async () => new Response('simple'));
      
      const request = new Request('http://localhost/simple');
      const context = new Context(request, new Container());
      
      await router.preHandle(context);
      
      expect((context as any).routeHandler).toBeUndefined();
    });
  });

  describe('getRoutes', () => {
    test('should return all registered routes', () => {
      router.get('/a', async () => new Response('a'));
      router.post('/b', async () => new Response('b'));
      router.put('/c', async () => new Response('c'));
      
      const routes = router.getRoutes();
      expect(routes.length).toBe(3);
    });
  });

  describe('clear', () => {
    test('should clear all routes', () => {
      router.get('/a', async () => new Response('a'));
      router.get('/b', async () => new Response('b'));
      
      router.clear();
      
      expect(router.getRoutes().length).toBe(0);
      expect(router.findRoute('GET', '/a')).toBeUndefined();
    });
  });
});

describe('RouteRegistry', () => {
  let registry: RouteRegistry;

  beforeEach(() => {
    registry = RouteRegistry.getInstance();
    registry.clear();
  });

  test('should be a singleton', () => {
    const instance1 = RouteRegistry.getInstance();
    const instance2 = RouteRegistry.getInstance();
    expect(instance1).toBe(instance2);
  });

  test('should register routes via convenience methods', () => {
    registry.get('/get', async () => new Response('get'));
    registry.post('/post', async () => new Response('post'));
    registry.put('/put', async () => new Response('put'));
    registry.delete('/delete', async () => new Response('delete'));
    registry.patch('/patch', async () => new Response('patch'));

    const router = registry.getRouter();
    expect(router.findRoute('GET', '/get')).toBeDefined();
    expect(router.findRoute('POST', '/post')).toBeDefined();
    expect(router.findRoute('PUT', '/put')).toBeDefined();
    expect(router.findRoute('DELETE', '/delete')).toBeDefined();
    expect(router.findRoute('PATCH', '/patch')).toBeDefined();
  });

  test('should register route with full options', () => {
    class TestController {}
    const middleware = async (ctx: Context, next: () => Promise<Response>) => next();

    registry.register('GET', '/full', async () => new Response('full'), [middleware], TestController, 'method');

    const router = registry.getRouter();
    const route = router.findRoute('GET', '/full');
    expect(route).toBeDefined();
    expect(route?.controllerClass).toBe(TestController);
  });

  test('should clear all routes', () => {
    registry.get('/test', async () => new Response('test'));
    registry.clear();
    
    const router = registry.getRouter();
    expect(router.findRoute('GET', '/test')).toBeUndefined();
  });
});
