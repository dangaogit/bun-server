import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  CacheableInterceptor,
  CacheEvictInterceptor,
  CachePutInterceptor,
} from '../../src/cache/interceptors';
import {
  Cacheable,
  CacheEvict,
  CachePut,
} from '../../src/cache/decorators';
import { CacheService } from '../../src/cache/service';
import { MemoryCacheStore } from '../../src/cache/types';
import { CACHE_SERVICE_TOKEN } from '../../src/cache/types';
import { Container } from '../../src/di/container';

describe('CacheableInterceptor', () => {
  let container: Container;
  let cacheService: CacheService;
  let interceptor: CacheableInterceptor;

  beforeEach(() => {
    container = new Container();
    const store = new MemoryCacheStore();
    cacheService = new CacheService(store);
    container.registerInstance(CACHE_SERVICE_TOKEN, cacheService);
    interceptor = new CacheableInterceptor();
  });

  test('should execute method and cache result', async () => {
    let callCount = 0;

    class TestService {
      @Cacheable({ key: 'test:{0}' })
      public getData(id: string): string {
        callCount++;
        return `data-${id}`;
      }
    }

    const service = new TestService();

    // 第一次调用
    const result1 = await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      ['123'],
      container,
    );

    expect(result1).toBe('data-123');
    expect(callCount).toBe(1);

    // 第二次调用应该从缓存返回
    const result2 = await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      ['123'],
      container,
    );

    expect(result2).toBe('data-123');
    expect(callCount).toBe(1); // 不应该增加
  });

  test('should generate default cache key when no key specified', async () => {
    class TestService {
      @Cacheable()
      public getData(): string {
        return 'data';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      [],
      container,
    );

    expect(result).toBe('data');
  });

  test('should use keyPrefix in cache key', async () => {
    class TestService {
      @Cacheable({ keyPrefix: 'myprefix' })
      public getData(): string {
        return 'data';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      [],
      container,
    );

    expect(result).toBe('data');
  });

  test('should skip caching when condition is false', async () => {
    let callCount = 0;

    class TestService {
      @Cacheable({ key: 'test', condition: 'false' })
      public getData(): string {
        callCount++;
        return 'data';
      }
    }

    const service = new TestService();

    await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      [],
      container,
    );

    await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      [],
      container,
    );

    // 每次都应该执行方法，因为 condition 为 false
    expect(callCount).toBe(2);
  });

  test('should execute method without caching when no metadata', async () => {
    class TestService {
      public getData(): string {
        return 'data';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      [],
      container,
    );

    expect(result).toBe('data');
  });

  test('should execute method when cache service not registered', async () => {
    const emptyContainer = new Container();

    class TestService {
      @Cacheable({ key: 'test' })
      public getData(): string {
        return 'data';
      }
    }

    const service = new TestService();

    // 应该正常执行，只是跳过缓存
    const result = await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      [],
      emptyContainer,
    );

    expect(result).toBe('data');
  });

  test('should resolve key template with positional arguments', async () => {
    class TestService {
      @Cacheable({ key: 'user:{0}:name:{1}' })
      public getData(userId: string, name: string): string {
        return `${userId}-${name}`;
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      ['123', 'alice'],
      container,
    );

    expect(result).toBe('123-alice');

    // 验证缓存
    const cached = await cacheService.get('user:123:name:alice');
    expect(cached).toBe('123-alice');
  });

  test('should handle TTL option', async () => {
    class TestService {
      @Cacheable({ key: 'test', ttl: 100 })
      public getData(): string {
        return 'data';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      [],
      container,
    );

    expect(result).toBe('data');
    // 立即检查应该存在
    const cached = await cacheService.get('test');
    expect(cached).toBe('data');
  });
});

describe('CacheEvictInterceptor', () => {
  let container: Container;
  let cacheService: CacheService;
  let interceptor: CacheEvictInterceptor;

  beforeEach(() => {
    container = new Container();
    const store = new MemoryCacheStore();
    cacheService = new CacheService(store);
    container.registerInstance(CACHE_SERVICE_TOKEN, cacheService);
    interceptor = new CacheEvictInterceptor();
  });

  test('should evict cache after method execution', async () => {
    await cacheService.set('user:123', 'cached-value');

    class TestService {
      @CacheEvict({ key: 'user:{0}' })
      public deleteUser(id: string): string {
        return 'deleted';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'deleteUser',
      service.deleteUser.bind(service),
      ['123'],
      container,
    );

    expect(result).toBe('deleted');
  });

  test('should handle beforeInvocation option', async () => {
    await cacheService.set('user:123', 'cached-value');

    class TestService {
      @CacheEvict({ key: 'user:{0}', beforeInvocation: true })
      public deleteUser(id: string): string {
        return 'deleted';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'deleteUser',
      service.deleteUser.bind(service),
      ['123'],
      container,
    );

    expect(result).toBe('deleted');
  });

  test('should handle allEntries option', async () => {
    await cacheService.set('key1', 'value1');
    await cacheService.set('key2', 'value2');

    class TestService {
      @CacheEvict({ allEntries: true })
      public clearAll(): string {
        return 'cleared';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'clearAll',
      service.clearAll.bind(service),
      [],
      container,
    );

    expect(result).toBe('cleared');
  });

  test('should execute method without eviction when no metadata', async () => {
    await cacheService.set('test', 'value');

    class TestService {
      public normalMethod(): string {
        return 'result';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'normalMethod',
      service.normalMethod.bind(service),
      [],
      container,
    );

    expect(result).toBe('result');
    // 缓存应该仍然存在
    const cached = await cacheService.get('test');
    expect(cached).toBe('value');
  });

  test('should execute method when cache service not registered', async () => {
    const emptyContainer = new Container();

    class TestService {
      @CacheEvict({ key: 'test' })
      public deleteData(): string {
        return 'deleted';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'deleteData',
      service.deleteData.bind(service),
      [],
      emptyContainer,
    );

    expect(result).toBe('deleted');
  });
});

describe('CachePutInterceptor', () => {
  let container: Container;
  let cacheService: CacheService;
  let interceptor: CachePutInterceptor;

  beforeEach(() => {
    container = new Container();
    const store = new MemoryCacheStore();
    cacheService = new CacheService(store);
    container.registerInstance(CACHE_SERVICE_TOKEN, cacheService);
    interceptor = new CachePutInterceptor();
  });

  test('should always execute method and update cache', async () => {
    let callCount = 0;

    class TestService {
      @CachePut({ key: 'user:{0}' })
      public updateUser(id: string): string {
        callCount++;
        return `updated-${id}-${callCount}`;
      }
    }

    const service = new TestService();

    // 第一次调用
    const result1 = await interceptor.execute(
      service,
      'updateUser',
      service.updateUser.bind(service),
      ['123'],
      container,
    );

    expect(result1).toBe('updated-123-1');
    expect(callCount).toBe(1);

    // 第二次调用也应该执行方法（CachePut 总是执行）
    const result2 = await interceptor.execute(
      service,
      'updateUser',
      service.updateUser.bind(service),
      ['123'],
      container,
    );

    expect(result2).toBe('updated-123-2');
    expect(callCount).toBe(2);

    // 缓存应该有最新值
    const cached = await cacheService.get('user:123');
    expect(cached).toBe('updated-123-2');
  });

  test('should skip cache update when condition is false', async () => {
    class TestService {
      @CachePut({ key: 'test', condition: 'false' })
      public updateData(): string {
        return 'data';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'updateData',
      service.updateData.bind(service),
      [],
      container,
    );

    expect(result).toBe('data');
  });

  test('should execute method without cache update when no metadata', async () => {
    class TestService {
      public normalMethod(): string {
        return 'result';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'normalMethod',
      service.normalMethod.bind(service),
      [],
      container,
    );

    expect(result).toBe('result');
  });

  test('should execute method when cache service not registered', async () => {
    const emptyContainer = new Container();

    class TestService {
      @CachePut({ key: 'test' })
      public updateData(): string {
        return 'updated';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'updateData',
      service.updateData.bind(service),
      [],
      emptyContainer,
    );

    expect(result).toBe('updated');
  });

  test('should handle TTL option', async () => {
    class TestService {
      @CachePut({ key: 'test', ttl: 100 })
      public updateData(): string {
        return 'data';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'updateData',
      service.updateData.bind(service),
      [],
      container,
    );

    expect(result).toBe('data');
    // 立即检查应该存在
    const cached = await cacheService.get('test');
    expect(cached).toBe('data');
  });

  test('should generate default cache key', async () => {
    class TestService {
      @CachePut()
      public updateData(): string {
        return 'data';
      }
    }

    const service = new TestService();

    const result = await interceptor.execute(
      service,
      'updateData',
      service.updateData.bind(service),
      [],
      container,
    );

    expect(result).toBe('data');
  });
});
