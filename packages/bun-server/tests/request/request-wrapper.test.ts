import { describe, expect, test } from 'bun:test';

import { RequestWrapper } from '../../src/request/request';

describe('RequestWrapper', () => {
  describe('constructor', () => {
    test('should create wrapper with basic request properties', () => {
      const request = new Request('http://localhost:3000/api/users?name=test');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.request).toBe(request);
      expect(wrapper.method).toBe('GET');
      expect(wrapper.path).toBe('/api/users');
      expect(wrapper.url.href).toBe('http://localhost:3000/api/users?name=test');
    });

    test('should parse URL correctly', () => {
      const request = new Request('http://example.com:8080/path/to/resource');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.url.hostname).toBe('example.com');
      expect(wrapper.url.port).toBe('8080');
      expect(wrapper.url.pathname).toBe('/path/to/resource');
    });

    test('should extract path correctly', () => {
      const request = new Request('http://localhost/users/123/posts?page=1');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.path).toBe('/users/123/posts');
    });

    test('should extract headers', () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer token123',
        },
      });
      const wrapper = new RequestWrapper(request);

      expect(wrapper.headers.get('Content-Type')).toBe('application/json');
      expect(wrapper.headers.get('Authorization')).toBe('Bearer token123');
    });

    test('should handle different HTTP methods', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

      for (const method of methods) {
        const request = new Request('http://localhost/test', { method });
        const wrapper = new RequestWrapper(request);
        expect(wrapper.method).toBe(method);
      }
    });
  });

  describe('query', () => {
    test('should parse query parameters', () => {
      const request = new Request('http://localhost/search?q=test&page=1&limit=10');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.query.get('q')).toBe('test');
      expect(wrapper.query.get('page')).toBe('1');
      expect(wrapper.query.get('limit')).toBe('10');
    });

    test('should return null for missing query parameter', () => {
      const request = new Request('http://localhost/search?q=test');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.query.get('missing')).toBeNull();
    });

    test('should handle URL without query parameters', () => {
      const request = new Request('http://localhost/api');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.query.toString()).toBe('');
      expect(wrapper.query.get('any')).toBeNull();
    });

    test('should handle URL-encoded query parameters', () => {
      const request = new Request('http://localhost/search?name=John%20Doe&email=test%40example.com');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.query.get('name')).toBe('John Doe');
      expect(wrapper.query.get('email')).toBe('test@example.com');
    });
  });

  describe('getQuery', () => {
    test('should return query parameter value', () => {
      const request = new Request('http://localhost/test?foo=bar');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.getQuery('foo')).toBe('bar');
    });

    test('should return null for missing parameter', () => {
      const request = new Request('http://localhost/test');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.getQuery('foo')).toBeNull();
    });
  });

  describe('getQueryAll', () => {
    test('should return all query parameters as object', () => {
      const request = new Request('http://localhost/test?a=1&b=2&c=3');
      const wrapper = new RequestWrapper(request);

      const queryAll = wrapper.getQueryAll();

      expect(queryAll).toEqual({
        a: '1',
        b: '2',
        c: '3',
      });
    });

    test('should return empty object when no query parameters', () => {
      const request = new Request('http://localhost/test');
      const wrapper = new RequestWrapper(request);

      const queryAll = wrapper.getQueryAll();

      expect(queryAll).toEqual({});
    });

    test('should handle duplicate keys (last value wins)', () => {
      // URLSearchParams 的 get 方法返回第一个值，但 forEach 会遍历所有
      // 我们的实现会用后面的值覆盖前面的
      const request = new Request('http://localhost/test?key=value1&key=value2');
      const wrapper = new RequestWrapper(request);

      const queryAll = wrapper.getQueryAll();

      // 后面的值会覆盖前面的
      expect(queryAll.key).toBe('value2');
    });
  });

  describe('getHeader', () => {
    test('should return header value', () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'X-Custom-Header': 'custom-value',
        },
      });
      const wrapper = new RequestWrapper(request);

      expect(wrapper.getHeader('X-Custom-Header')).toBe('custom-value');
    });

    test('should return null for missing header', () => {
      const request = new Request('http://localhost/test');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.getHeader('X-Missing-Header')).toBeNull();
    });

    test('should be case-insensitive', () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const wrapper = new RequestWrapper(request);

      expect(wrapper.getHeader('content-type')).toBe('application/json');
      expect(wrapper.getHeader('CONTENT-TYPE')).toBe('application/json');
    });
  });

  describe('body', () => {
    test('should parse JSON body', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: 'test', value: 123 }),
      });
      const wrapper = new RequestWrapper(request);

      const body = await wrapper.body();

      expect(body).toEqual({ name: 'test', value: 123 });
    });

    test('should cache parsed body', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cached: true }),
      });
      const wrapper = new RequestWrapper(request);

      const body1 = await wrapper.body();
      const body2 = await wrapper.body();

      expect(body1).toBe(body2); // 同一个引用
    });

    test('should parse form data', async () => {
      const formData = new FormData();
      formData.append('username', 'testuser');
      formData.append('password', 'secret');

      const request = new Request('http://localhost/test', {
        method: 'POST',
        body: formData,
      });
      const wrapper = new RequestWrapper(request);

      const body = await wrapper.body();

      expect(body).toBeInstanceOf(FormData);
    });

    test('should parse URL-encoded body', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: 'name=test&value=123',
      });
      const wrapper = new RequestWrapper(request);

      const body = await wrapper.body();

      expect(body).toEqual({ name: 'test', value: '123' });
    });

    test('should handle empty body', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: '',
      });
      const wrapper = new RequestWrapper(request);

      const body = await wrapper.body();

      // 空字符串 JSON 解析会返回 null 或抛出错误
      // BodyParser 对空体应该返回 null
      expect(body === null || body === undefined || body === '').toBe(true);
    });
  });

  describe('getBody', () => {
    test('should return undefined before body is parsed', () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      });
      const wrapper = new RequestWrapper(request);

      expect(wrapper.getBody()).toBeUndefined();
    });

    test('should return parsed body after body() is called', async () => {
      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ test: true }),
      });
      const wrapper = new RequestWrapper(request);

      // 先解析 body
      await wrapper.body();

      // 现在 getBody 应该返回已解析的值
      expect(wrapper.getBody()).toEqual({ test: true });
    });
  });

  describe('edge cases', () => {
    test('should handle root path', () => {
      const request = new Request('http://localhost/');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.path).toBe('/');
    });

    test('should handle path without leading slash (edge case)', () => {
      // URL 规范会自动添加 /
      const request = new Request('http://localhost');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.path).toBe('/');
    });

    test('should handle complex query strings', () => {
      const request = new Request('http://localhost/api?arr[]=1&arr[]=2&obj[key]=value');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.query.getAll('arr[]')).toEqual(['1', '2']);
      expect(wrapper.query.get('obj[key]')).toBe('value');
    });

    test('should handle special characters in path', () => {
      const request = new Request('http://localhost/api/users/user%40example.com');
      const wrapper = new RequestWrapper(request);

      expect(wrapper.path).toBe('/api/users/user%40example.com');
    });
  });
});
