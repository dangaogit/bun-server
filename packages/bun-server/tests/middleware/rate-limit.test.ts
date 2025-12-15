import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { Context } from '../../src/core/context';
import { Controller } from '../../src/controller';
import { GET } from '../../src/router/decorators';
import { createRateLimitMiddleware, MemoryRateLimitStore, type RateLimitOptions } from '../../src/middleware/builtin/rate-limit';
import { RateLimit } from '../../src/middleware/decorators';
import { getTestPort } from '../utils/test-port';

describe('Rate Limit Middleware', () => {
  let app: Application;
  let port: number;

  beforeEach(() => {
    port = getTestPort();
    app = new Application({ port });
  });

  afterEach(async () => {
    await app.stop();
  });

  test('should allow requests within limit', async () => {
    const middleware = createRateLimitMiddleware({
      max: 5,
      windowMs: 60000,
    });

    let requestCount = 0;
    const handler = async (context: Context) => {
      requestCount++;
      return context.createResponse({ count: requestCount });
    };

    const context1 = new Context(new Request('http://localhost:3000/test'));
    const response1 = await middleware(context1, async () => handler(context1));

    expect(response1.status).toBe(200);
    expect(response1.headers.get('RateLimit-Limit')).toBe('5');
    expect(response1.headers.get('RateLimit-Remaining')).toBe('4');
  });

  test('should block requests exceeding limit', async () => {
    const store = new MemoryRateLimitStore();
    const middleware = createRateLimitMiddleware({
      max: 2,
      windowMs: 60000,
      store,
    });

    const handler = async (context: Context) => {
      return context.createResponse({ success: true });
    };

    const context1 = new Context(new Request('http://localhost:3000/test'));
    const context2 = new Context(new Request('http://localhost:3000/test'));
    const context3 = new Context(new Request('http://localhost:3000/test'));

    // 前两次请求应该成功
    const response1 = await middleware(context1, async () => handler(context1));
    expect(response1.status).toBe(200);

    const response2 = await middleware(context2, async () => handler(context2));
    expect(response2.status).toBe(200);
    expect(response2.headers.get('RateLimit-Remaining')).toBe('0');

    // 第三次请求应该被限制
    const response3 = await middleware(context3, async () => handler(context3));
    expect(response3.status).toBe(429);
    const data3 = await response3.json();
    expect(data3.error).toBe('Too Many Requests');
    expect(data3.retryAfter).toBeDefined();
  });

  test('should use different keys for different IPs', async () => {
    const store = new MemoryRateLimitStore();
    const middleware = createRateLimitMiddleware({
      max: 1,
      windowMs: 60000,
      store,
    });

    const handler = async (context: Context) => {
      return context.createResponse({ success: true });
    };

    // IP 1 的请求
    const request1 = new Request('http://localhost:3000/test', {
      headers: { 'X-Forwarded-For': '192.168.1.1' },
    });
    const context1 = new Context(request1);
    const response1 = await middleware(context1, async () => handler(context1));
    expect(response1.status).toBe(200);

    // IP 2 的请求（应该也成功，因为使用不同的键）
    const request2 = new Request('http://localhost:3000/test', {
      headers: { 'X-Forwarded-For': '192.168.1.2' },
    });
    const context2 = new Context(request2);
    const response2 = await middleware(context2, async () => handler(context2));
    expect(response2.status).toBe(200);

    // IP 1 的第二次请求（应该被限制）
    const request3 = new Request('http://localhost:3000/test', {
      headers: { 'X-Forwarded-For': '192.168.1.1' },
    });
    const context3 = new Context(request3);
    const response3 = await middleware(context3, async () => handler(context3));
    expect(response3.status).toBe(429);
  });

  test('should reset after window expires', async () => {
    const store = new MemoryRateLimitStore();
    const middleware = createRateLimitMiddleware({
      max: 1,
      windowMs: 100, // 100ms 窗口
      store,
    });

    const handler = async (context: Context) => {
      return context.createResponse({ success: true });
    };

    const context1 = new Context(new Request('http://localhost:3000/test'));
    const response1 = await middleware(context1, async () => handler(context1));
    expect(response1.status).toBe(200);

    // 立即再次请求应该被限制
    const context2 = new Context(new Request('http://localhost:3000/test'));
    const response2 = await middleware(context2, async () => handler(context2));
    expect(response2.status).toBe(429);

    // 等待窗口过期
    await new Promise((resolve) => setTimeout(resolve, 150));

    // 应该可以再次请求
    const context3 = new Context(new Request('http://localhost:3000/test'));
    const response3 = await middleware(context3, async () => handler(context3));
    expect(response3.status).toBe(200);
  });

  test('should work with @RateLimit decorator', async () => {
    @Controller('/api/rate-limit')
    class RateLimitController {
      @RateLimit({ max: 2, windowMs: 60000 })
      @GET('/test')
      public test() {
        return { message: 'ok' };
      }
    }

    app.registerController(RateLimitController);
    app.listen();

    // 前两次请求应该成功
    const response1 = await fetch(`http://localhost:${port}/api/rate-limit/test`);
    expect(response1.status).toBe(200);
    expect(response1.headers.get('RateLimit-Limit')).toBe('2');

    const response2 = await fetch(`http://localhost:${port}/api/rate-limit/test`);
    expect(response2.status).toBe(200);

    // 第三次请求应该被限制
    const response3 = await fetch(`http://localhost:${port}/api/rate-limit/test`);
    expect(response3.status).toBe(429);
  });

  test('should support custom key generator', async () => {
    const store = new MemoryRateLimitStore();
    const middleware = createRateLimitMiddleware({
      max: 1,
      windowMs: 60000,
      store,
      keyGenerator: (context) => {
        const userId = context.getHeader('X-User-Id');
        return userId ? `user:${userId}` : `ip:${context.getClientIp()}`;
      },
    });

    const handler = async (context: Context) => {
      return context.createResponse({ success: true });
    };

    // User 1 的请求
    const request1 = new Request('http://localhost:3000/test', {
      headers: { 'X-User-Id': 'user1' },
    });
    const context1 = new Context(request1);
    const response1 = await middleware(context1, async () => handler(context1));
    expect(response1.status).toBe(200);

    // User 2 的请求（应该也成功）
    const request2 = new Request('http://localhost:3000/test', {
      headers: { 'X-User-Id': 'user2' },
    });
    const context2 = new Context(request2);
    const response2 = await middleware(context2, async () => handler(context2));
    expect(response2.status).toBe(200);

    // User 1 的第二次请求（应该被限制）
    const request3 = new Request('http://localhost:3000/test', {
      headers: { 'X-User-Id': 'user1' },
    });
    const context3 = new Context(request3);
    const response3 = await middleware(context3, async () => handler(context3));
    expect(response3.status).toBe(429);
  });

  test('should support custom message and status code', async () => {
    const middleware = createRateLimitMiddleware({
      max: 1,
      windowMs: 60000,
      message: 'Rate limit exceeded',
      statusCode: 503,
    });

    const handler = async (context: Context) => {
      return context.createResponse({ success: true });
    };

    const context1 = new Context(new Request('http://localhost:3000/test'));
    await middleware(context1, async () => handler(context1));

    const context2 = new Context(new Request('http://localhost:3000/test'));
    const response2 = await middleware(context2, async () => handler(context2));
    expect(response2.status).toBe(503);
    const data = await response2.json();
    expect(data.error).toBe('Rate limit exceeded');
  });

  test('should include standard headers', async () => {
    const middleware = createRateLimitMiddleware({
      max: 10,
      windowMs: 60000,
      standardHeaders: true,
      legacyHeaders: true,
    });

    const handler = async (context: Context) => {
      return context.createResponse({ success: true });
    };

    const context = new Context(new Request('http://localhost:3000/test'));
    const response = await middleware(context, async () => handler(context));

    expect(response.headers.get('RateLimit-Limit')).toBe('10');
    expect(response.headers.get('RateLimit-Remaining')).toBe('9');
    expect(response.headers.get('RateLimit-Reset')).toBeDefined();
    expect(response.headers.get('X-RateLimit-Limit')).toBe('10');
    expect(response.headers.get('X-RateLimit-Remaining')).toBe('9');
    expect(response.headers.get('X-RateLimit-Reset')).toBeDefined();
  });

  test('should get client IP from X-Forwarded-For header', () => {
    const request = new Request('http://localhost:3000/test', {
      headers: { 'X-Forwarded-For': '192.168.1.100, 10.0.0.1' },
    });
    const context = new Context(request);
    const ip = context.getClientIp();
    expect(ip).toBe('192.168.1.100');
  });

  test('should get client IP from X-Real-IP header', () => {
    const request = new Request('http://localhost:3000/test', {
      headers: { 'X-Real-IP': '192.168.1.200' },
    });
    const context = new Context(request);
    const ip = context.getClientIp();
    expect(ip).toBe('192.168.1.200');
  });
});

describe('MemoryRateLimitStore', () => {
  let store: MemoryRateLimitStore;

  beforeEach(() => {
    store = new MemoryRateLimitStore();
  });

  test('should increment count', async () => {
    const count1 = await store.increment('test-key', 1000);
    expect(count1).toBe(1);

    const count2 = await store.increment('test-key', 1000);
    expect(count2).toBe(2);
  });

  test('should reset count after window expires', async () => {
    await store.increment('test-key', 100);
    await store.increment('test-key', 100);

    // 等待窗口过期
    await new Promise((resolve) => setTimeout(resolve, 150));

    const count = await store.get('test-key');
    expect(count).toBe(0);
  });

  test('should reset count manually', async () => {
    await store.increment('test-key', 1000);
    await store.reset('test-key');

    const count = await store.get('test-key');
    expect(count).toBe(0);
  });

  test('should cleanup expired entries', async () => {
    await store.increment('key1', 100);
    await store.increment('key2', 1000);

    // 等待 key1 过期
    await new Promise((resolve) => setTimeout(resolve, 150));

    store.cleanup();

    expect(await store.get('key1')).toBe(0);
    expect(await store.get('key2')).toBeGreaterThan(0);
  });
});
