import 'reflect-metadata';
import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Application } from '../../../src/core/application';
import { Controller, ControllerRegistry } from '../../../src/controller/controller';
import { GET } from '../../../src/router/decorators';
import { RouteRegistry } from '../../../src/router/registry';
import {
  Cache,
  CacheInterceptor,
  CACHE_METADATA_KEY,
  InterceptorRegistry,
  INTERCEPTOR_REGISTRY_TOKEN,
} from '../../../src/interceptor';
import { getTestPort } from '../../utils/test-port';

describe('CacheInterceptor', () => {
  let app: Application;
  let port: number;
  let interceptorRegistry: InterceptorRegistry;
  let callCount = 0;

  beforeEach(() => {
    port = getTestPort();
    app = new Application({ port });
    interceptorRegistry = app.getContainer().resolve<InterceptorRegistry>(
      INTERCEPTOR_REGISTRY_TOKEN,
    );
    interceptorRegistry.register(CACHE_METADATA_KEY, new CacheInterceptor());
    callCount = 0;
    CacheInterceptor.clearCache();
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
    interceptorRegistry.clear();
    CacheInterceptor.clearCache();
  });

  test('should cache method result', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/')
      @Cache({ ttl: 1000 })
      public getData() {
        callCount++;
        return { data: 'cached', count: callCount };
      }
    }

    app.registerController(TestController);
    await app.listen();

    // 第一次调用
    const response1 = await fetch(`http://localhost:${port}/api/test`);
    expect(response1.status).toBe(200);
    const data1 = await response1.json();
    expect(data1.count).toBe(1);
    expect(callCount).toBe(1);

    // 第二次调用（应该使用缓存）
    const response2 = await fetch(`http://localhost:${port}/api/test`);
    expect(response2.status).toBe(200);
    const data2 = await response2.json();
    expect(data2.count).toBe(1); // 缓存的结果
    expect(callCount).toBe(1); // 方法没有被再次调用
  });

  test('should use custom cache key', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/')
      @Cache({ ttl: 1000, key: 'custom-key' })
      public getData() {
        callCount++;
        return { data: 'cached' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    await fetch(`http://localhost:${port}/api/test`);
    await fetch(`http://localhost:${port}/api/test`);

    expect(callCount).toBe(1); // 应该只调用一次（使用缓存）
  });

  test('should expire cache after TTL', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/')
      @Cache({ ttl: 100 }) // 100ms TTL
      public getData() {
        callCount++;
        return { data: 'cached', count: callCount };
      }
    }

    app.registerController(TestController);
    await app.listen();

    // 第一次调用
    await fetch(`http://localhost:${port}/api/test`);
    expect(callCount).toBe(1);

    // 等待缓存过期
    await new Promise((resolve) => setTimeout(resolve, 150));

    // 第二次调用（缓存已过期）
    await fetch(`http://localhost:${port}/api/test`);
    expect(callCount).toBe(2);
  });

  test('should work without cache decorator', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/')
      public getData() {
        callCount++;
        return { data: 'no-cache' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    await fetch(`http://localhost:${port}/api/test`);
    await fetch(`http://localhost:${port}/api/test`);

    expect(callCount).toBe(2); // 没有缓存，应该调用两次
  });
});

