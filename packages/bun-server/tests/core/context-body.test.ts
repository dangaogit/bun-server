import { describe, expect, test } from 'bun:test';
import { Context } from '../../src/core/context';

describe('Context Body Parsing', () => {
  test('should parse JSON body', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John', age: 30 }),
    });

    const context = new Context(request);
    const body = await context.getBody();

    expect(body).toEqual({ name: 'John', age: 30 });
    expect(context.body).toEqual({ name: 'John', age: 30 });
  });

  test('should parse body only once', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John' }),
    });

    const context = new Context(request);
    const body1 = await context.getBody();
    const body2 = await context.getBody();

    expect(body1).toEqual(body2);
  });

  test('should return undefined for GET request', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'GET',
    });

    const context = new Context(request);
    const body = await context.getBody();

    expect(body).toBeUndefined();
  });
});

