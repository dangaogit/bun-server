import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { createCorsMiddleware } from '../../../src/middleware/builtin/cors';
import { createLoggerMiddleware } from '../../../src/middleware/builtin/logger';
import { createStaticFileMiddleware } from '../../../src/middleware/builtin/static-file';
import { createFileUploadMiddleware } from '../../../src/middleware/builtin/file-upload';
import { Context } from '../../../src/core/context';
import { Container } from '../../../src/di/container';

describe('CORS Middleware', () => {
  test('should add CORS headers to context', async () => {
    const middleware = createCorsMiddleware({
      origin: '*',
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type'],
    });

    const request = new Request('http://localhost/api/data', {
      headers: { Origin: 'http://example.com' },
    });
    const context = new Context(request, new Container());

    await middleware(context, async () => new Response('ok'));

    // CORS middleware sets headers on context.responseHeaders
    expect(context.responseHeaders.get('Access-Control-Allow-Origin')).toBe('*');
  });

  test('should handle preflight OPTIONS request', async () => {
    const middleware = createCorsMiddleware({
      origin: 'http://example.com',
      methods: ['GET', 'POST', 'PUT'],
    });

    const request = new Request('http://localhost/api/data', {
      method: 'OPTIONS',
      headers: { Origin: 'http://example.com' },
    });
    const context = new Context(request, new Container());

    const response = await middleware(context, async () => new Response('should not reach'));

    expect(response.status).toBe(204);
  });

  test('should use array of origins', async () => {
    const middleware = createCorsMiddleware({
      origin: ['http://allowed.com', 'http://example.com'],
    });

    const request = new Request('http://localhost/api/data', {
      headers: { Origin: 'http://allowed.com' },
    });
    const context = new Context(request, new Container());

    await middleware(context, async () => new Response('ok'));

    expect(context.responseHeaders.get('Access-Control-Allow-Origin')).toBe('http://allowed.com');
  });

  test('should set credentials header when enabled', async () => {
    const middleware = createCorsMiddleware({
      origin: '*',
      credentials: true,
    });

    const request = new Request('http://localhost/api/data', {
      headers: { Origin: 'http://example.com' },
    });
    const context = new Context(request, new Container());

    await middleware(context, async () => new Response('ok'));

    expect(context.responseHeaders.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  test('should set exposed headers', async () => {
    const middleware = createCorsMiddleware({
      origin: '*',
      exposedHeaders: ['X-Custom-Header'],
    });

    const request = new Request('http://localhost/api/data');
    const context = new Context(request, new Container());

    await middleware(context, async () => new Response('ok'));

    expect(context.responseHeaders.get('Access-Control-Expose-Headers')).toBe('X-Custom-Header');
  });
});

describe('Logger Middleware', () => {
  test('should log request information', async () => {
    const logs: string[] = [];
    const middleware = createLoggerMiddleware({
      logger: (msg) => logs.push(msg),
    });

    const request = new Request('http://localhost/api/data');
    const context = new Context(request, new Container());

    await middleware(context, async () => new Response('ok'));

    expect(logs.length).toBeGreaterThan(0);
    expect(logs.some((log) => log.includes('/api/data'))).toBe(true);
  });

  test('should log status code', async () => {
    const logs: string[] = [];
    const middleware = createLoggerMiddleware({
      logger: (msg) => logs.push(msg),
    });

    const request = new Request('http://localhost/api/test');
    const context = new Context(request, new Container());

    await middleware(context, async () => new Response('ok', { status: 200 }));

    expect(logs.some((log) => log.includes('200'))).toBe(true);
  });

  test('should use custom prefix', async () => {
    const logs: string[] = [];
    const middleware = createLoggerMiddleware({
      prefix: '[MyApp]',
      logger: (msg) => logs.push(msg),
    });

    const request = new Request('http://localhost/test');
    const context = new Context(request, new Container());

    await middleware(context, async () => new Response('ok'));

    expect(logs.some((log) => log.includes('[MyApp]'))).toBe(true);
  });
});

describe('Static File Middleware', () => {
  test('should return 404 for non-existent file', async () => {
    const middleware = createStaticFileMiddleware({
      root: '/tmp/nonexistent-dir',
    });

    const request = new Request('http://localhost/file.txt');
    const context = new Context(request, new Container());

    const response = await middleware(context, async () => new Response('not found', { status: 404 }));

    // Should pass to next middleware if file not found
    expect(response.status).toBe(404);
  });

  test('should use custom prefix', async () => {
    const middleware = createStaticFileMiddleware({
      root: '/tmp',
      prefix: '/static',
    });

    const request = new Request('http://localhost/static/file.txt');
    const context = new Context(request, new Container());

    // Should attempt to serve from /tmp/file.txt
    const response = await middleware(context, async () => new Response('fallback'));

    expect(response).toBeDefined();
  });

  test('should skip non-GET requests', async () => {
    const middleware = createStaticFileMiddleware({
      root: '/tmp',
    });

    const request = new Request('http://localhost/file.txt', { method: 'POST' });
    const context = new Context(request, new Container());

    let nextCalled = false;
    await middleware(context, async () => {
      nextCalled = true;
      return new Response('ok');
    });

    expect(nextCalled).toBe(true);
  });
});

describe('File Upload Middleware', () => {
  test('should skip non-POST/PUT requests', async () => {
    const middleware = createFileUploadMiddleware();

    const request = new Request('http://localhost/upload', { method: 'GET' });
    const context = new Context(request, new Container());

    let nextCalled = false;
    await middleware(context, async () => {
      nextCalled = true;
      return new Response('ok');
    });

    expect(nextCalled).toBe(true);
  });

  test('should skip requests without multipart content type', async () => {
    const middleware = createFileUploadMiddleware();

    const request = new Request('http://localhost/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    });
    const context = new Context(request, new Container());

    let nextCalled = false;
    await middleware(context, async () => {
      nextCalled = true;
      return new Response('ok');
    });

    expect(nextCalled).toBe(true);
  });

  test('should use custom max file size', () => {
    const middleware = createFileUploadMiddleware({
      maxFileSize: 1024 * 1024 * 10, // 10MB
    });

    expect(middleware).toBeDefined();
  });

  test('should use custom upload directory', () => {
    const middleware = createFileUploadMiddleware({
      uploadDir: '/tmp/uploads',
    });

    expect(middleware).toBeDefined();
  });
});
