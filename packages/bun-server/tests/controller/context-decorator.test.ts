import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { Controller, Context, Param } from '../../src/controller';
import { GET } from '../../src/router';
import { contextStore } from '../../src/core/context-service';
import { Context as ContextType } from '../../src/core/context';
import { getTestPort } from '../utils/test-port';

describe('@Context() Decorator', () => {
  let app: Application;
  let port: number;

  beforeEach(() => {
    port = getTestPort();
    app = new Application({ port });
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
  });

  test('should inject Context into controller method', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/context')
      public async getContext(@Context() context: ContextType) {
        expect(context).toBeDefined();
        expect(context.path).toBe('/api/test/context');
        return { path: context.path, method: context.method };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/test/context`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.path).toBe('/api/test/context');
    expect(data.method).toBe('GET');
  });

  test('should inject Context with other parameters', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/users/:id')
      public async getUser(
        @Context() context: ContextType,
        @Param('id') id: string,
      ) {
        expect(context).toBeDefined();
        expect(id).toBe('123');
        return {
          id,
          path: context.path,
          method: context.method,
        };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/test/users/123`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe('123');
    expect(data.path).toBe('/api/test/users/123');
  });

  test('should access headers from injected Context', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/headers')
      public async getHeaders(@Context() context: ContextType) {
        const authHeader = context.getHeader('Authorization');
        return { authorization: authHeader };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/test/headers`, {
      headers: { 'Authorization': 'Bearer token123' },
    });
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.authorization).toBe('Bearer token123');
  });

  test('should access query params from injected Context', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/query')
      public async getQuery(@Context() context: ContextType) {
        const name = context.getQuery('name');
        const age = context.getQuery('age');
        return { name, age };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/test/query?name=John&age=30`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.name).toBe('John');
    expect(data.age).toBe('30');
  });

  test('should access path params from injected Context', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/users/:id/posts/:postId')
      public async getPost(@Context() context: ContextType) {
        const userId = context.getParam('id');
        const postId = context.getParam('postId');
        return { userId, postId };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/test/users/123/posts/456`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.userId).toBe('123');
    expect(data.postId).toBe('456');
  });

  test('should set response headers via injected Context', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/custom-header')
      public async setHeader(@Context() context: ContextType) {
        context.setHeader('X-Custom-Header', 'custom-value');
        return { message: 'ok' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/test/custom-header`);
    expect(response.status).toBe(200);
    expect(response.headers.get('X-Custom-Header')).toBe('custom-value');
  });

  test('should handle Context injection in service layer', async () => {
    // 这个测试验证 ContextService 可以在服务层使用
    const { ContextService, CONTEXT_SERVICE_TOKEN } = await import('../../src/core/context-service');
    const container = app.getContainer();
    const contextService = container.resolve<ContextService>(CONTEXT_SERVICE_TOKEN);

    @Controller('/api/test')
    class TestController {
      @GET('/service-context')
      public async getServiceContext() {
        // 在控制器中，ContextService 应该能够访问当前请求的 Context
        const context = contextService.getContext();
        if (!context) {
          return { error: 'No context' };
        }
        return { path: context.path, method: context.method };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/test/service-context`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.path).toBe('/api/test/service-context');
    expect(data.method).toBe('GET');
  });
});

