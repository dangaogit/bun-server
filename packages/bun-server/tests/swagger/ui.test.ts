import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { createSwaggerUIMiddleware } from '../../src/swagger/ui';
import { SwaggerExtension } from '../../src/swagger/swagger-extension';
import { Context } from '../../src/core/context';

describe('createSwaggerUIMiddleware', () => {
  let swaggerExtension: SwaggerExtension;

  beforeEach(() => {
    swaggerExtension = new SwaggerExtension({
      info: {
        title: 'Test API',
        version: '1.0.0',
        description: 'Test API description',
      },
    });
  });

  test('should return Swagger UI HTML for default ui path', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension);
    const request = new Request('http://localhost/swagger');
    const context = new Context(request);

    const response = await middleware(context, async () => {
      return new Response('next');
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');

    const html = await response.text();
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('swagger-ui');
    expect(html).toContain('API Documentation - Swagger UI');
    expect(html).toContain('/swagger.json');
  });

  test('should return Swagger UI HTML for path with trailing slash', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension);
    const request = new Request('http://localhost/swagger/');
    const context = new Context(request);

    const response = await middleware(context, async () => {
      return new Response('next');
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');

    const html = await response.text();
    expect(html).toContain('swagger-ui');
  });

  test('should return Swagger JSON for default json path', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension);
    const request = new Request('http://localhost/swagger.json');
    const context = new Context(request);

    const response = await middleware(context, async () => {
      return new Response('next');
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json; charset=utf-8');

    const json = await response.json();
    expect(json.openapi).toBe('3.0.0');
    expect(json.info.title).toBe('Test API');
    expect(json.info.version).toBe('1.0.0');
  });

  test('should use custom ui path', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension, {
      uiPath: '/api-docs',
    });

    // 访问自定义路径应该返回 UI
    const request1 = new Request('http://localhost/api-docs');
    const context1 = new Context(request1);
    const response1 = await middleware(context1, async () => new Response('next'));

    expect(response1.status).toBe(200);
    expect(response1.headers.get('Content-Type')).toBe('text/html; charset=utf-8');

    // 访问默认路径应该调用 next
    const request2 = new Request('http://localhost/swagger');
    const context2 = new Context(request2);
    const response2 = await middleware(context2, async () => new Response('next'));

    expect(await response2.text()).toBe('next');
  });

  test('should use custom json path', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension, {
      jsonPath: '/api/openapi.json',
    });

    // 访问自定义 JSON 路径
    const request1 = new Request('http://localhost/api/openapi.json');
    const context1 = new Context(request1);
    const response1 = await middleware(context1, async () => new Response('next'));

    expect(response1.status).toBe(200);
    expect(response1.headers.get('Content-Type')).toBe('application/json; charset=utf-8');

    // UI 页面应该引用自定义 JSON 路径
    const request2 = new Request('http://localhost/swagger');
    const context2 = new Context(request2);
    const response2 = await middleware(context2, async () => new Response('next'));

    const html = await response2.text();
    expect(html).toContain('/api/openapi.json');
  });

  test('should use custom title', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension, {
      title: 'My Custom API',
    });

    const request = new Request('http://localhost/swagger');
    const context = new Context(request);
    const response = await middleware(context, async () => new Response('next'));

    const html = await response.text();
    expect(html).toContain('My Custom API - Swagger UI');
  });

  test('should call next for non-swagger paths', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension);

    const request = new Request('http://localhost/api/users');
    const context = new Context(request);

    let nextCalled = false;
    const response = await middleware(context, async () => {
      nextCalled = true;
      return new Response('api response');
    });

    expect(nextCalled).toBe(true);
    expect(await response.text()).toBe('api response');
  });

  test('should use all custom options together', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension, {
      uiPath: '/docs',
      jsonPath: '/docs/spec.json',
      title: 'Complete API',
    });

    // UI 路径
    const request1 = new Request('http://localhost/docs');
    const context1 = new Context(request1);
    const response1 = await middleware(context1, async () => new Response('next'));

    const html = await response1.text();
    expect(html).toContain('Complete API - Swagger UI');
    expect(html).toContain('/docs/spec.json');

    // JSON 路径
    const request2 = new Request('http://localhost/docs/spec.json');
    const context2 = new Context(request2);
    const response2 = await middleware(context2, async () => new Response('next'));

    expect(response2.headers.get('Content-Type')).toBe('application/json; charset=utf-8');
  });

  test('should use default values when options are empty', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension, {});

    const request = new Request('http://localhost/swagger');
    const context = new Context(request);
    const response = await middleware(context, async () => new Response('next'));

    const html = await response.text();
    expect(html).toContain('API Documentation - Swagger UI');
    expect(html).toContain('/swagger.json');
  });

  test('should include swagger-ui scripts and styles', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension);
    const request = new Request('http://localhost/swagger');
    const context = new Context(request);

    const response = await middleware(context, async () => new Response('next'));
    const html = await response.text();

    // 检查 CDN 资源
    expect(html).toContain('https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui.css');
    expect(html).toContain('https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-bundle.js');
    expect(html).toContain('https://unpkg.com/swagger-ui-dist@5.9.0/swagger-ui-standalone-preset.js');

    // 检查初始化代码
    expect(html).toContain('SwaggerUIBundle');
    expect(html).toContain('SwaggerUIStandalonePreset');
    expect(html).toContain('deepLinking: true');
  });

  test('should handle paths with query strings', async () => {
    const middleware = createSwaggerUIMiddleware(swaggerExtension);

    const request = new Request('http://localhost/swagger?foo=bar');
    const context = new Context(request);

    const response = await middleware(context, async () => new Response('next'));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html; charset=utf-8');
  });
});
