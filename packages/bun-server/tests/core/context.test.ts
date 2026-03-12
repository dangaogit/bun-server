import { describe, expect, test } from 'bun:test';
import { Context } from '../../src/core/context';

describe('Context', () => {
  test('should create context from request', () => {
    const request = new Request('http://localhost:3000/api/users?id=1');
    const context = new Context(request);

    expect(context.request).toBe(request);
    expect(context.method).toBe('GET');
    expect(context.path).toBe('/api/users');
    expect(context.getQuery('id')).toBe('1');
  });

  test('should get query parameters', () => {
    const request = new Request('http://localhost:3000/api/users?name=John&age=30');
    const context = new Context(request);

    expect(context.getQuery('name')).toBe('John');
    expect(context.getQuery('age')).toBe('30');
    expect(context.getQuery('unknown')).toBeNull();
  });

  test('should get all query parameters', () => {
    const request = new Request('http://localhost:3000/api/users?name=John&age=30');
    const context = new Context(request);

    const all = context.getQueryAll();
    expect(all.name).toBe('John');
    expect(all.age).toBe('30');
  });

  test('should get and set path parameters', () => {
    const request = new Request('http://localhost:3000/api/users/123');
    const context = new Context(request);

    context.params = { id: '123' };
    expect(context.getParam('id')).toBe('123');
    expect(context.getParam('unknown')).toBeUndefined();
  });

  test('should get headers', () => {
    const request = new Request('http://localhost:3000/api/users', {
      headers: { 'Content-Type': 'application/json' },
    });
    const context = new Context(request);

    expect(context.getHeader('Content-Type')).toBe('application/json');
    expect(context.getHeader('Unknown')).toBeNull();
  });

  test('should set response headers', () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    context.setHeader('Content-Type', 'application/json');
    expect(context.responseHeaders.get('Content-Type')).toBe('application/json');
  });

  test('should set status code', () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    context.setStatus(404);
    expect(context.statusCode).toBe(404);
  });

  test('should create JSON response', () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    const response = context.createResponse({ message: 'Hello' });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');
  });

  test('should create response with custom status', () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);
    context.setStatus(404);

    const response = context.createResponse({ error: 'Not Found' });
    expect(response.status).toBe(404);
  });

  test('createResponse should keep business fields unchanged', async () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);

    const response = context.createResponse({
      stack: 'business-stack-value',
      data: { trace: 'business-trace-value' },
    });
    const body = (await response.json()) as {
      stack: string;
      data: { trace: string };
    };

    expect(body.stack).toBe('business-stack-value');
    expect(body.data.trace).toBe('business-trace-value');
  });

  test('createErrorResponse should redact sensitive fields', async () => {
    const request = new Request('http://localhost:3000/api/users');
    const context = new Context(request);
    context.setStatus(400);

    const response = context.createErrorResponse({
      error: 'bad request',
      stack: 'hidden',
      details: {
        trace: 'hidden-trace',
        cause: 'hidden-cause',
      },
      items: [
        {
          trace: 'hidden-array-trace',
          safe: 'value',
        },
      ],
    });
    const body = (await response.json()) as {
      error: string;
      stack?: string;
      details: { trace?: string; cause?: string };
      items: Array<{ trace?: string; safe: string }>;
    };

    expect(response.status).toBe(400);
    expect(body.error).toBe('bad request');
    expect(body.stack).toBeUndefined();
    expect(body.details.trace).toBeUndefined();
    expect(body.details.cause).toBeUndefined();
    expect(body.items[0]?.trace).toBeUndefined();
    expect(body.items[0]?.safe).toBe('value');
  });
});

