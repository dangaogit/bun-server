import { describe, expect, test } from 'bun:test';

import { BodyParser } from '../../src/request/body-parser';

describe('BodyParser', () => {
  describe('parse', () => {
    test('should return undefined for GET request', async () => {
      const request = new Request('http://localhost/test', {
        method: 'GET',
      });

      const result = await BodyParser.parse(request);
      expect(result).toBeUndefined();
    });

    test('should return undefined for HEAD request', async () => {
      const request = new Request('http://localhost/test', {
        method: 'HEAD',
      });

      const result = await BodyParser.parse(request);
      expect(result).toBeUndefined();
    });

    test('should return undefined when Content-Length is 0', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Length': '0',
        },
      });

      const result = await BodyParser.parse(request);
      expect(result).toBeUndefined();
    });

    test('should parse JSON body', async () => {
      const body = { name: 'test', value: 123 };
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await BodyParser.parse(request);
      expect(result).toEqual(body);
    });

    test('should parse JSON with charset', async () => {
      const body = { message: 'hello' };
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
        },
        body: JSON.stringify(body),
      });

      const result = await BodyParser.parse(request);
      expect(result).toEqual(body);
    });

    test('should return undefined for empty JSON body', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '',
      });

      const result = await BodyParser.parse(request);
      expect(result).toBeUndefined();
    });

    test('should parse FormData', async () => {
      const formData = new FormData();
      formData.append('name', 'test');
      formData.append('file', new Blob(['content']), 'test.txt');

      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: formData,
      });

      const result = await BodyParser.parse(request);
      expect(result).toBeInstanceOf(FormData);
      expect((result as FormData).get('name')).toBe('test');
    });

    test('should parse URL-encoded body', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'name=test&age=25',
      });

      const result = await BodyParser.parse(request);
      expect(result).toEqual({ name: 'test', age: '25' });
    });

    test('should return undefined for empty URL-encoded body', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: '',
      });

      const result = await BodyParser.parse(request);
      expect(result).toBeUndefined();
    });

    test('should parse text/plain body', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'Hello, World!',
      });

      const result = await BodyParser.parse(request);
      expect(result).toBe('Hello, World!');
    });

    test('should parse text/html body', async () => {
      const html = '<html><body>Test</body></html>';
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/html',
        },
        body: html,
      });

      const result = await BodyParser.parse(request);
      expect(result).toBe(html);
    });

    test('should try JSON for unknown content type with JSON body', async () => {
      const body = { key: 'value' };
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(JSON.stringify(body).length),
        },
        body: JSON.stringify(body),
      });

      const result = await BodyParser.parse(request);
      expect(result).toEqual(body);
    });

    test('should return text for unknown content type with non-JSON body', async () => {
      const text = 'not a json';
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Length': String(text.length),
        },
        body: text,
      });

      const result = await BodyParser.parse(request);
      expect(result).toBe(text);
    });

    test('should handle body without Content-Type', async () => {
      const body = { data: 'test' };
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const result = await BodyParser.parse(request);
      // 应该尝试解析为 JSON
      expect(result).toEqual(body);
    });

    test('should return text when body without Content-Type is not JSON', async () => {
      const text = 'plain text without content type';
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: text,
      });

      const result = await BodyParser.parse(request);
      expect(result).toBe(text);
    });

    test('should return undefined for empty body without Content-Type', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: '',
      });

      const result = await BodyParser.parse(request);
      expect(result).toBeUndefined();
    });

    test('should handle complex JSON structures', async () => {
      const body = {
        users: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
        meta: {
          total: 2,
          page: 1,
        },
      };

      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await BodyParser.parse(request);
      expect(result).toEqual(body);
    });

    test('should handle URL-encoded with special characters', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'name=John%20Doe&email=test%40example.com',
      });

      const result = await BodyParser.parse(request);
      expect(result).toEqual({
        name: 'John Doe',
        email: 'test@example.com',
      });
    });

    test('should handle PUT request with body', async () => {
      const body = { updated: true };
      const request = new Request('http://localhost/test', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await BodyParser.parse(request);
      expect(result).toEqual(body);
    });

    test('should handle DELETE request with body', async () => {
      const body = { ids: [1, 2, 3] };
      const request = new Request('http://localhost/test', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await BodyParser.parse(request);
      expect(result).toEqual(body);
    });

    test('should handle PATCH request with body', async () => {
      const body = { field: 'newValue' };
      const request = new Request('http://localhost/test', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const result = await BodyParser.parse(request);
      expect(result).toEqual(body);
    });
  });
});
