import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import 'reflect-metadata';

import {
  Cache,
  getCacheMetadata,
  CacheInterceptor,
  CACHE_METADATA_KEY,
  type CacheOptions,
} from '../../../src/interceptor/builtin/cache-interceptor';
import { Container } from '../../../src/di/container';

describe('Cache Decorator', () => {
  test('should set cache metadata with default ttl', () => {
    class TestService {
      @Cache()
      public getData(): string {
        return 'data';
      }
    }

    const metadata = getCacheMetadata(TestService.prototype, 'getData');
    expect(metadata).toBeDefined();
    expect(metadata?.ttl).toBe(60000);
    expect(metadata?.key).toBeUndefined();
  });

  test('should set cache metadata with custom ttl', () => {
    class TestService {
      @Cache({ ttl: 30000 })
      public getData(): string {
        return 'data';
      }
    }

    const metadata = getCacheMetadata(TestService.prototype, 'getData');
    expect(metadata?.ttl).toBe(30000);
  });

  test('should set cache metadata with custom key', () => {
    class TestService {
      @Cache({ key: 'my-custom-key' })
      public getData(): string {
        return 'data';
      }
    }

    const metadata = getCacheMetadata(TestService.prototype, 'getData');
    expect(metadata?.key).toBe('my-custom-key');
  });

  test('should set cache metadata with all options', () => {
    class TestService {
      @Cache({ ttl: 120000, key: 'full-options' })
      public getData(): string {
        return 'data';
      }
    }

    const metadata = getCacheMetadata(TestService.prototype, 'getData');
    expect(metadata?.ttl).toBe(120000);
    expect(metadata?.key).toBe('full-options');
  });
});

describe('getCacheMetadata', () => {
  test('should return undefined for non-decorated method', () => {
    class TestService {
      public normalMethod(): string {
        return 'data';
      }
    }

    const metadata = getCacheMetadata(TestService.prototype, 'normalMethod');
    expect(metadata).toBeUndefined();
  });

  test('should return undefined for null target', () => {
    const metadata = getCacheMetadata(null, 'method');
    expect(metadata).toBeUndefined();
  });

  test('should return undefined for non-object target', () => {
    const metadata = getCacheMetadata('string', 'method');
    expect(metadata).toBeUndefined();
  });
});

describe('CacheInterceptor', () => {
  let container: Container;
  let interceptor: CacheInterceptor;

  beforeEach(() => {
    container = new Container();
    interceptor = new CacheInterceptor();
    CacheInterceptor.clearCache();
  });

  afterEach(() => {
    CacheInterceptor.clearCache();
  });

  test('should cache method result', async () => {
    let callCount = 0;

    class TestService {
      @Cache({ ttl: 60000 })
      public getData(): string {
        callCount++;
        return 'data';
      }
    }

    const service = new TestService();

    // 第一次调用
    const result1 = await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      [],
      container,
    );

    expect(result1).toBe('data');
    expect(callCount).toBe(1);

    // 第二次调用应该从缓存返回
    const result2 = await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      [],
      container,
    );

    expect(result2).toBe('data');
    expect(callCount).toBe(1);
  });

  test('should use custom cache key', async () => {
    class TestService {
      @Cache({ key: 'custom-key' })
      public getData(): string {
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

    const stats = CacheInterceptor.getCacheStats();
    expect(stats.keys).toContain('custom-key');
  });

  test('should generate cache key from class, method and args', async () => {
    class TestService {
      @Cache()
      public getData(id: string): string {
        return `data-${id}`;
      }
    }

    const service = new TestService();

    await interceptor.execute(
      service,
      'getData',
      service.getData.bind(service),
      ['123'],
      container,
    );

    const stats = CacheInterceptor.getCacheStats();
    expect(stats.size).toBe(1);
    // 键应该包含类名、方法名和参数
    expect(stats.keys[0]).toContain('TestService');
    expect(stats.keys[0]).toContain('getData');
    expect(stats.keys[0]).toContain('123');
  });

  test('should execute method without caching when no metadata', async () => {
    let callCount = 0;

    class TestService {
      public normalMethod(): string {
        callCount++;
        return 'data';
      }
    }

    const service = new TestService();

    await interceptor.execute(
      service,
      'normalMethod',
      service.normalMethod.bind(service),
      [],
      container,
    );

    await interceptor.execute(
      service,
      'normalMethod',
      service.normalMethod.bind(service),
      [],
      container,
    );

    expect(callCount).toBe(2);
  });

  test('should clear all cache', async () => {
    class TestService {
      @Cache()
      public getData(): string {
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

    expect(CacheInterceptor.getCacheStats().size).toBe(1);

    CacheInterceptor.clearCache();

    expect(CacheInterceptor.getCacheStats().size).toBe(0);
  });

  test('should clear specific cache key', async () => {
    class TestService {
      @Cache({ key: 'key1' })
      public getData1(): string {
        return 'data1';
      }

      @Cache({ key: 'key2' })
      public getData2(): string {
        return 'data2';
      }
    }

    const service = new TestService();

    await interceptor.execute(
      service,
      'getData1',
      service.getData1.bind(service),
      [],
      container,
    );

    await interceptor.execute(
      service,
      'getData2',
      service.getData2.bind(service),
      [],
      container,
    );

    expect(CacheInterceptor.getCacheStats().size).toBe(2);

    CacheInterceptor.clearCacheKey('key1');

    const stats = CacheInterceptor.getCacheStats();
    expect(stats.size).toBe(1);
    expect(stats.keys).toContain('key2');
  });
});
