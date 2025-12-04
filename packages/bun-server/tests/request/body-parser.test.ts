import { describe, expect, test } from 'bun:test';
import { BodyParser } from '../../src/request/body-parser';

describe('BodyParser', () => {
  test('should parse JSON body', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John', age: 30 }),
    });

    const body = await BodyParser.parse(request);
    expect(body).toEqual({ name: 'John', age: 30 });
  });

  test('should parse URLEncoded body', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'name=John&age=30',
    });

    const body = await BodyParser.parse(request);
    expect(body).toEqual({ name: 'John', age: '30' });
  });

  test('should parse text body', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: 'Hello World',
    });

    const body = await BodyParser.parse(request);
    expect(body).toBe('Hello World');
  });

  test('should return undefined for empty body', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'GET',
    });

    const body = await BodyParser.parse(request);
    expect(body).toBeUndefined();
  });

  test('should parse JSON as default', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({ name: 'John' }),
    });

    const body = await BodyParser.parse(request);
    expect(body).toEqual({ name: 'John' });
  });

  test('should fall back to text when JSON parse fails', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      body: 'plain-text',
    });

    const body = await BodyParser.parse(request);
    expect(body).toBe('plain-text');
  });

  test('should respect explicit zero content-length', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      headers: { 'Content-Length': '0' },
    });

    const body = await BodyParser.parse(request);
    expect(body).toBeUndefined();
  });

  test('should return undefined for HEAD requests', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'HEAD',
    });

    const body = await BodyParser.parse(request);
    expect(body).toBeUndefined();
  });

  test('should parse text content when content headers missing but body exists', async () => {
    const request = new Request('http://localhost:3000/api/users', {
      method: 'POST',
      body: 'fallback text',
    });

    const body = await BodyParser.parse(request);
    expect(body).toBe('fallback text');
  });
});

