import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  CacheServiceProxy,
  EnableCacheProxy,
  isCacheProxyEnabled,
  CachePostProcessor,
  CACHE_PROXY_ENABLED_KEY,
} from '../../src/cache/service-proxy';
import {
  Cacheable,
  CacheEvict,
  CachePut,
} from '../../src/cache/decorators';
import { CacheService } from '../../src/cache/service';
import { MemoryCacheStore, CACHE_SERVICE_TOKEN } from '../../src/cache/types';
import { Container } from '../../src/di/container';

describe('CacheServiceProxy', () => {
  let container: Container;
  let cacheService: CacheService;

  beforeEach(() => {
    container = new Container();
    const store = new MemoryCacheStore();
    cacheService = new CacheService(store);
    container.registerInstance(CACHE_SERVICE_TOKEN, cacheService);
  });

  describe('createProxy', () => {
    test('should return original instance if no cache decorators', () => {
      class NoCacheService {
        public getValue(): string {
          return 'value';
        }
      }

      const instance = new NoCacheService();
      const proxied = CacheServiceProxy.createProxy(instance, container);

      // 如果没有缓存装饰器，应该返回原实例
      expect(proxied).toBe(instance);
    });

    test('should create proxy for service with @Cacheable', async () => {
      let callCount = 0;

      class UserService {
        @Cacheable({ key: 'user:{0}' })
        public findById(id: string): string {
          callCount++;
          return `User-${id}`;
        }
      }

      const instance = new UserService();
      const proxied = CacheServiceProxy.createProxy(instance, container);

      // 第一次调用应该执行方法
      const result1 = await (proxied.findById as any)('123');
      expect(result1).toBe('User-123');
      expect(callCount).toBe(1);

      // 第二次调用应该从缓存返回
      const result2 = await (proxied.findById as any)('123');
      expect(result2).toBe('User-123');
      expect(callCount).toBe(1); // 不应该增加
    });

    test('should create proxy for service with @CacheEvict', async () => {
      class UserService {
        @CacheEvict({ key: 'user:{0}' })
        public deleteUser(id: string): string {
          return 'deleted';
        }
      }

      const instance = new UserService();
      const proxied = CacheServiceProxy.createProxy(instance, container);

      const result = await (proxied.deleteUser as any)('123');
      expect(result).toBe('deleted');
    });

    test('should create proxy for service with @CacheEvict beforeInvocation', async () => {
      class UserService {
        @CacheEvict({ key: 'user:{0}', beforeInvocation: true })
        public deleteUser(id: string): string {
          return 'deleted';
        }
      }

      const instance = new UserService();
      const proxied = CacheServiceProxy.createProxy(instance, container);

      const result = await (proxied.deleteUser as any)('123');
      expect(result).toBe('deleted');
    });

    test('should create proxy for service with @CachePut', async () => {
      class UserService {
        @CachePut({ key: 'user:{0}' })
        public updateUser(id: string): string {
          return `Updated-${id}`;
        }
      }

      const instance = new UserService();
      const proxied = CacheServiceProxy.createProxy(instance, container);

      // CachePut 总是执行方法并更新缓存
      const result = await (proxied.updateUser as any)('123');
      expect(result).toBe('Updated-123');

      // 验证缓存被更新
      const cached = await cacheService.get('user:123');
      expect(cached).toBe('Updated-123');
    });

    test('should handle non-function properties', () => {
      class ServiceWithProps {
        public name = 'TestService';

        @Cacheable()
        public getData(): string {
          return 'data';
        }
      }

      const instance = new ServiceWithProps();
      const proxied = CacheServiceProxy.createProxy(instance, container);

      // 非函数属性应该正常访问
      expect(proxied.name).toBe('TestService');
    });

    test('should handle symbol properties', () => {
      const sym = Symbol('test');

      class ServiceWithSymbol {
        public [sym](): string {
          return 'symbol method';
        }

        @Cacheable()
        public getData(): string {
          return 'data';
        }
      }

      const instance = new ServiceWithSymbol();
      const proxied = CacheServiceProxy.createProxy(instance, container);

      // Symbol 属性的方法应该正常执行（不被拦截）
      expect(proxied[sym]()).toBe('symbol method');
    });
  });
});

describe('EnableCacheProxy decorator', () => {
  test('should set cache proxy enabled metadata', () => {
    @EnableCacheProxy()
    class TestService {}

    const enabled = isCacheProxyEnabled(TestService);
    expect(enabled).toBe(true);
  });

  test('should return false for non-decorated class', () => {
    class TestService {}

    const enabled = isCacheProxyEnabled(TestService);
    expect(enabled).toBe(false);
  });

  test('should set metadata with correct key', () => {
    @EnableCacheProxy()
    class TestService {}

    const metadata = Reflect.getMetadata(CACHE_PROXY_ENABLED_KEY, TestService);
    expect(metadata).toBe(true);
  });
});

describe('CachePostProcessor', () => {
  let container: Container;
  let cacheService: CacheService;
  let processor: CachePostProcessor;

  beforeEach(() => {
    container = new Container();
    const store = new MemoryCacheStore();
    cacheService = new CacheService(store);
    container.registerInstance(CACHE_SERVICE_TOKEN, cacheService);
    processor = new CachePostProcessor();
  });

  test('should have correct priority', () => {
    expect(processor.priority).toBe(50);
  });

  test('should return original instance if not enabled', () => {
    class RegularService {
      public getData(): string {
        return 'data';
      }
    }

    const instance = new RegularService();
    const result = processor.postProcess(instance, RegularService, container);

    expect(result).toBe(instance);
  });

  test('should create proxy for enabled service', () => {
    @EnableCacheProxy()
    class CachedService {
      @Cacheable({ key: 'test' })
      public getData(): string {
        return 'data';
      }
    }

    const instance = new CachedService();
    const result = processor.postProcess(instance, CachedService, container);

    // 应该返回代理而不是原实例
    expect(result).not.toBe(instance);
  });

  test('should return original if enabled but no cache decorators', () => {
    @EnableCacheProxy()
    class ServiceWithoutDecorators {
      public getData(): string {
        return 'data';
      }
    }

    const instance = new ServiceWithoutDecorators();
    const result = processor.postProcess(instance, ServiceWithoutDecorators, container);

    // 没有缓存装饰器时，即使启用了代理也返回原实例
    expect(result).toBe(instance);
  });
});
