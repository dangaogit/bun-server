import { describe, expect, test, beforeEach } from 'bun:test';
import { ContextService, contextStore, CONTEXT_SERVICE_TOKEN } from '../../src/core/context-service';
import { Context } from '../../src/core/context';
import { Container } from '../../src/di/container';

describe('ContextService', () => {
  let contextService: ContextService;
  let container: Container;

  beforeEach(() => {
    container = new Container();
    contextService = new ContextService();
    container.registerInstance(CONTEXT_SERVICE_TOKEN, contextService);
  });

  test('should create ContextService instance', () => {
    expect(contextService).toBeInstanceOf(ContextService);
  });

  test('should get context from AsyncLocalStorage', async () => {
    const request = new Request('http://localhost:3000/api/users?id=1');
    const context = new Context(request);

    await contextStore.run(context, async () => {
      const retrievedContext = contextService.getContext();
      expect(retrievedContext).toBe(context);
      expect(retrievedContext?.getQuery('id')).toBe('1');
    });
  });

  test('should return undefined when not in request context', () => {
    const context = contextService.getContext();
    expect(context).toBeUndefined();
  });

  test('should get header from context', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      headers: { 'Authorization': 'Bearer token123' },
    });
    const context = new Context(request);

    await contextStore.run(context, async () => {
      const header = contextService.getHeader('Authorization');
      expect(header).toBe('Bearer token123');
    });
  });

  test('should return null for non-existent header', async () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    await contextStore.run(context, async () => {
      const header = contextService.getHeader('NonExistent');
      expect(header).toBeNull();
    });
  });

  test('should get query parameter from context', async () => {
    const request = new Request('http://localhost:3000/api/users?name=John&age=30');
    const context = new Context(request);

    await contextStore.run(context, async () => {
      expect(contextService.getQuery('name')).toBe('John');
      expect(contextService.getQuery('age')).toBe('30');
      expect(contextService.getQuery('unknown')).toBeNull();
    });
  });

  test('should get all query parameters', async () => {
    const request = new Request('http://localhost:3000/api/users?name=John&age=30');
    const context = new Context(request);

    await contextStore.run(context, async () => {
      const all = contextService.getQueryAll();
      expect(all.name).toBe('John');
      expect(all.age).toBe('30');
    });
  });

  test('should get path parameter from context', async () => {
    const request = new Request('http://localhost:3000/api/users/123');
    const context = new Context(request);
    context.params = { id: '123' };

    await contextStore.run(context, async () => {
      expect(contextService.getParam('id')).toBe('123');
      expect(contextService.getParam('unknown')).toBeUndefined();
    });
  });

  test('should return null when body is not parsed', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John' }),
    });
    const context = new Context(request);

    await contextStore.run(context, async () => {
      expect(contextService.getBody()).toBeNull();
    });
  });

  test('should get request method', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
    });
    const context = new Context(request);

    await contextStore.run(context, async () => {
      expect(contextService.getMethod()).toBe('POST');
    });
  });

  test('should get request path', async () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    await contextStore.run(context, async () => {
      expect(contextService.getPath()).toBe('/api/users');
    });
  });

  test('should get request URL', async () => {
    const request = new Request('http://localhost:3000/api/users?id=1');
    const context = new Context(request);

    await contextStore.run(context, async () => {
      const url = contextService.getUrl();
      expect(url).toBeDefined();
      expect(url?.pathname).toBe('/api/users');
      expect(url?.searchParams.get('id')).toBe('1');
    });
  });

  test('should get client IP', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      headers: { 'X-Forwarded-For': '192.168.1.1' },
    });
    const context = new Context(request);

    await contextStore.run(context, async () => {
      const ip = contextService.getClientIp();
      expect(ip).toBe('192.168.1.1');
    });
  });

  test('should set response header', async () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    await contextStore.run(context, async () => {
      contextService.setHeader('Content-Type', 'application/json');
      expect(context.responseHeaders.get('Content-Type')).toBe('application/json');
    });
  });

  test('should set status code', async () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    await contextStore.run(context, async () => {
      contextService.setStatus(404);
      expect(context.statusCode).toBe(404);
    });
  });

  test('should handle multiple concurrent requests', async () => {
    const request1 = new Request('http://localhost:3000/api/users?name=User1');
    const request2 = new Request('http://localhost:3000/api/users?name=User2');
    const context1 = new Context(request1);
    const context2 = new Context(request2);

    // 模拟并发请求
    const promises = [
      contextStore.run(context1, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return contextService.getQuery('name');
      }),
      contextStore.run(context2, async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return contextService.getQuery('name');
      }),
    ];

    const results = await Promise.all(promises);
    expect(results[0]).toBe('User1');
    expect(results[1]).toBe('User2');
  });
});

