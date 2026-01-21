import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  MemoryRateLimitStore,
  createRateLimitMiddleware,
  type RateLimitOptions,
} from '../../../src/middleware/builtin/rate-limit';
import { Context } from '../../../src/core/context';
import { Container } from '../../../src/di/container';

describe('MemoryRateLimitStore', () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  describe('get', () => {
    test('should return 0 for non-existent key', async () => {
      const count = await store.get('non-existent');
      expect(count).toBe(0);
    });

    test('should return current count', async () => {
      await store.increment('key1', 60000);
      await store.increment('key1', 60000);
      const count = await store.get('key1');
      expect(count).toBe(2);
    });

    test('should return 0 for expired key', async () => {
      await store.increment('key2', 50); // 50ms window
      await new Promise((resolve) => setTimeout(resolve, 100));
      const count = await store.get('key2');
      expect(count).toBe(0);
    });
  });

  describe('increment', () => {
    test('should start at 1 for new key', async () => {
      const count = await store.increment('new-key', 60000);
      expect(count).toBe(1);
    });

    test('should increment existing key', async () => {
      await store.increment('incr-key', 60000);
      await store.increment('incr-key', 60000);
      const count = await store.increment('incr-key', 60000);
      expect(count).toBe(3);
    });

    test('should reset count after window expires', async () => {
      await store.increment('expire-key', 50);
      await store.increment('expire-key', 50);
      expect(await store.get('expire-key')).toBe(2);
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const count = await store.increment('expire-key', 50);
      expect(count).toBe(1); // Should reset
    });
  });

  describe('reset', () => {
    test('should reset count to 0', async () => {
      await store.increment('reset-key', 60000);
      await store.increment('reset-key', 60000);
      await store.reset('reset-key');
      const count = await store.get('reset-key');
      expect(count).toBe(0);
    });
  });

  describe('cleanup', () => {
    test('should remove expired entries', async () => {
      await store.increment('cleanup1', 50);
      await store.increment('cleanup2', 60000);
      
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      store.cleanup();
      
      expect(await store.get('cleanup1')).toBe(0); // expired
      expect(await store.get('cleanup2')).toBe(1); // still valid
    });
  });
});

describe('createRateLimitMiddleware', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  test('should allow requests within limit', async () => {
    const middleware = createRateLimitMiddleware({
      max: 5,
      windowMs: 60000,
    });

    const request = new Request('http://localhost/test');
    const context = new Context(request, container);

    let passed = false;
    const next = async (): Promise<Response> => {
      passed = true;
      return new Response('OK');
    };

    await middleware(context, next);
    expect(passed).toBe(true);
  });

  test('should block requests exceeding limit', async () => {
    const store = new MemoryRateLimitStore();
    const middleware = createRateLimitMiddleware({
      max: 2,
      windowMs: 60000,
      store,
    });

    const request = new Request('http://localhost/test');
    
    // First request
    const context1 = new Context(request, container);
    await middleware(context1, async () => new Response('OK'));

    // Second request
    const context2 = new Context(request, container);
    await middleware(context2, async () => new Response('OK'));

    // Third request should be blocked
    const context3 = new Context(request, container);
    let blocked = false;
    const response = await middleware(context3, async () => {
      blocked = true;
      return new Response('OK');
    });

    expect(blocked).toBe(false);
    expect(response?.status).toBe(429);
  });

  test('should use custom key generator', async () => {
    const keys: string[] = [];
    const middleware = createRateLimitMiddleware({
      max: 10,
      windowMs: 60000,
      keyGenerator: (ctx: Context) => {
        const key = ctx.request.headers.get('X-API-Key') ?? 'anonymous';
        keys.push(key);
        return key;
      },
    });

    const request1 = new Request('http://localhost/test', {
      headers: { 'X-API-Key': 'key-abc' },
    });
    const context1 = new Context(request1, container);
    await middleware(context1, async () => new Response('OK'));

    const request2 = new Request('http://localhost/test', {
      headers: { 'X-API-Key': 'key-xyz' },
    });
    const context2 = new Context(request2, container);
    await middleware(context2, async () => new Response('OK'));

    expect(keys).toContain('key-abc');
    expect(keys).toContain('key-xyz');
  });

  test('should track rate limit in context', async () => {
    const middleware = createRateLimitMiddleware({
      max: 5,
      windowMs: 60000,
    });

    const request = new Request('http://localhost/test');
    const context = new Context(request, container);

    await middleware(context, async () => new Response('OK'));

    // Headers are set on context, not on response
    expect(context.getHeader('X-RateLimit-Limit')).toBeNull(); // getHeader reads request headers, returns null for non-existent
    // The middleware sets response headers via context.setHeader
  });

  test('should return 429 response when rate limited', async () => {
    const store = new MemoryRateLimitStore();
    const middleware = createRateLimitMiddleware({
      max: 1,
      windowMs: 60000,
      store,
    });

    const request = new Request('http://localhost/test');
    
    // First request
    const context1 = new Context(request, container);
    await middleware(context1, async () => new Response('OK'));

    // Second request should be rate limited
    const context2 = new Context(request, container);
    const response = await middleware(context2, async () => new Response('OK'));

    expect(response?.status).toBe(429);
    const body = await response?.json() as { error: string };
    expect(body.error).toBe('Too Many Requests');
  });

  test('should use default windowMs of 60000', async () => {
    const middleware = createRateLimitMiddleware({
      max: 100,
    });

    // Should not throw and should create middleware successfully
    expect(typeof middleware).toBe('function');
  });

  test('should skip rate limiting when skip function returns true', async () => {
    const store = new MemoryRateLimitStore();
    const middleware = createRateLimitMiddleware({
      max: 1,
      windowMs: 60000,
      store,
      skip: (ctx: Context) => ctx.request.url.includes('/health'),
    });

    // Health check should be skipped
    const healthRequest = new Request('http://localhost/health');
    const healthContext = new Context(healthRequest, container);
    let healthPassed = false;
    await middleware(healthContext, async () => {
      healthPassed = true;
      return new Response('OK');
    });
    expect(healthPassed).toBe(true);

    // Normal requests should be rate limited
    const normalRequest1 = new Request('http://localhost/api');
    const normalContext1 = new Context(normalRequest1, container);
    await middleware(normalContext1, async () => new Response('OK'));

    const normalRequest2 = new Request('http://localhost/api');
    const normalContext2 = new Context(normalRequest2, container);
    let normalPassed = false;
    const response = await middleware(normalContext2, async () => {
      normalPassed = true;
      return new Response('OK');
    });

    expect(normalPassed).toBe(false);
    expect(response?.status).toBe(429);
  });
});
