import { describe, expect, test } from 'bun:test';

import { Context } from '../../src/core/context';
import {
  createLoggerMiddleware,
  createRequestLoggingMiddleware,
  createErrorHandlingMiddleware,
  createCorsMiddleware,
  runMiddlewares,
} from '../../src/middleware';
import { ValidationError } from '../../src/validation/errors';
import { HttpException } from '../../src/error/http-exception';

function createContext(url = 'http://localhost:3000/api/test', method: string = 'GET'): Context {
  return new Context(
    new Request(url, {
      method,
      headers: {
        Origin: 'http://localhost:4000',
      },
    }),
  );
}

describe('Builtin Middlewares', () => {
  test('logger middleware should invoke custom logger', async () => {
    const logs: string[] = [];
    const logger = createLoggerMiddleware({
      logger: (message) => logs.push(message),
      prefix: '[TestLogger]',
    });

    const ctx = createContext();
    const response = await runMiddlewares(
      [logger],
      ctx,
      async () => ctx.createResponse({ message: 'ok' }),
    );

    expect(await response.json()).toEqual({ message: 'ok' });
    expect(logs).toContain('[TestLogger] GET /api/test 200');
  });

  test('logger middleware should log downstream status code', async () => {
    const logs: string[] = [];
    const logger = createLoggerMiddleware({
      logger: (message) => logs.push(message),
      prefix: '[TestLogger]',
    });

    const ctx = createContext();
    const response = await runMiddlewares(
      [logger],
      ctx,
      async () => {
        ctx.setStatus(404);
        return ctx.createResponse({ error: 'not found' });
      },
    );

    expect(response.status).toBe(404);
    expect(logs).toContain('[TestLogger] GET /api/test 404');
  });

  test('request logging middleware should set duration header', async () => {
    const ctx = createContext();
    const middleware = createRequestLoggingMiddleware({ setHeader: true });

    const response = await runMiddlewares(
      [middleware],
      ctx,
      async () => ctx.createResponse({ ok: true }),
    );

    expect(response.headers.get('x-request-duration')).toBeDefined();
  });

  test('request logging middleware should capture error details', async () => {
    const logs: Array<{ message: string; details?: Record<string, unknown> }> = [];
    const middleware = createRequestLoggingMiddleware({
      logger: (message, details) => logs.push({ message, details }),
      setHeader: false,
      prefix: '[ReqTest]',
    });

    const ctx = createContext();
    await expect(
      runMiddlewares([middleware], ctx, async () => {
        throw new Error('request failed');
      }),
    ).rejects.toThrow('request failed');

    expect(logs[0]?.message).toContain('[ReqTest] GET /api/test error');
    expect(logs[0]?.details?.error).toBe('request failed');
  });

  test('error handling middleware should capture errors', async () => {
    const errors: string[] = [];
    const middleware = createErrorHandlingMiddleware({
      exposeError: true,
      logger: (error) => {
        errors.push(error instanceof Error ? error.message : String(error));
      },
    });

    const ctx = createContext();
    const response = await runMiddlewares([middleware], ctx, async () => {
      throw new Error('boom');
    });

    expect(errors).toContain('boom');
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'boom' });
  });

  test('error handling middleware should format validation errors', async () => {
    const middleware = createErrorHandlingMiddleware();
    const ctx = createContext();
    const response = await runMiddlewares([middleware], ctx, async () => {
      throw new ValidationError('invalid', [{ index: 0, rule: 'IsString', message: 'bad' }]);
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'invalid',
      issues: [{ index: 0, rule: 'IsString', message: 'bad' }],
    });
  });

  test('error handling middleware should return response when downstream throws Response', async () => {
    const middleware = createErrorHandlingMiddleware();
    const ctx = createContext();
    const downstream = new Response('prebuilt', { status: 418 });
    const response = await runMiddlewares([middleware], ctx, async () => {
      throw downstream;
    });

    expect(response.status).toBe(418);
    expect(await response.text()).toBe('prebuilt');
  });

  test('error handling middleware should respect HttpException exposure flag', async () => {
    const middleware = createErrorHandlingMiddleware();
    const ctx = createContext();
    const response = await runMiddlewares([middleware], ctx, async () => {
      throw new HttpException(503, 'Service down', { retry: true });
    });

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: 'Service down',
      details: { retry: true },
    });
  });

  test('error handling middleware should expose HttpException when configured', async () => {
    const middleware = createErrorHandlingMiddleware({ exposeError: true });
    const ctx = createContext();
    const response = await runMiddlewares([middleware], ctx, async () => {
      throw new HttpException(429, 'Too Many Requests');
    });

    expect(response.status).toBe(429);
    expect(await response.json()).toEqual({ error: 'Too Many Requests' });
  });

  test('cors middleware should handle options request', async () => {
    const cors = createCorsMiddleware({
      origin: ['http://localhost:4000'],
      allowedHeaders: ['Content-Type'],
    });

    const ctx = createContext('http://localhost:3000/api/cors', 'OPTIONS');
    const response = await runMiddlewares([cors], ctx, async () =>
      ctx.createResponse({ ok: true }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:4000');
    expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
  });

  test('cors middleware should allow fine grained configuration', async () => {
    const cors = createCorsMiddleware({
      origin: ['http://foo.com', 'http://bar.com'],
      methods: ['GET'],
      allowedHeaders: ['X-Test'],
      exposedHeaders: ['X-Expose'],
      credentials: false,
      maxAge: 10,
    });

    const ctx = createContext('http://localhost:3000/api/cors', 'GET');
    ctx.headers.set('Origin', 'http://bar.com');
    const response = await runMiddlewares([cors], ctx, async () => ctx.createResponse({}));

    expect(response).toBeDefined();
    expect(ctx.responseHeaders.get('Access-Control-Allow-Origin')).toBe('http://bar.com');
    expect(ctx.responseHeaders.get('Access-Control-Allow-Credentials')).toBeNull();
    expect(ctx.responseHeaders.get('Access-Control-Allow-Methods')).toBe('GET');
    expect(ctx.responseHeaders.get('Access-Control-Expose-Headers')).toBe('X-Expose');
    expect(ctx.responseHeaders.get('Access-Control-Max-Age')).toBe('10');
  });
});


