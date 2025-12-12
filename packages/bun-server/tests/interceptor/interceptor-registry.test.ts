import 'reflect-metadata';
import { describe, expect, test, beforeEach } from 'bun:test';
import { InterceptorRegistry, INTERCEPTOR_REGISTRY_TOKEN } from '../../src/interceptor';
import type { Interceptor } from '../../src/interceptor';
import type { Container } from '../../src/di/container';
import type { Context } from '../../src/core/context';

describe('InterceptorRegistry', () => {
  let registry: InterceptorRegistry;
  const METADATA_KEY_1 = Symbol('test:metadata:1');
  const METADATA_KEY_2 = Symbol('test:metadata:2');

  beforeEach(() => {
    registry = new InterceptorRegistry();
  });

  test('should register interceptor', () => {
    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    registry.register(METADATA_KEY_1, interceptor);
    expect(registry.hasInterceptor(METADATA_KEY_1)).toBe(true);
    expect(registry.count(METADATA_KEY_1)).toBe(1);
  });

  test('should register multiple interceptors with same metadata key', () => {
    const interceptor1: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };
    const interceptor2: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    registry.register(METADATA_KEY_1, interceptor1, 100);
    registry.register(METADATA_KEY_1, interceptor2, 50);

    const interceptors = registry.getInterceptors(METADATA_KEY_1);
    expect(interceptors.length).toBe(2);
    // 应该按优先级排序（50 < 100，所以 interceptor2 在前）
    expect(interceptors[0]).toBe(interceptor2);
    expect(interceptors[1]).toBe(interceptor1);
  });

  test('should not register duplicate interceptor', () => {
    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    registry.register(METADATA_KEY_1, interceptor);
    registry.register(METADATA_KEY_1, interceptor); // 重复注册

    expect(registry.count(METADATA_KEY_1)).toBe(1);
  });

  test('should get interceptors by metadata key', () => {
    const interceptor1: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };
    const interceptor2: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    registry.register(METADATA_KEY_1, interceptor1);
    registry.register(METADATA_KEY_2, interceptor2);

    const interceptors1 = registry.getInterceptors(METADATA_KEY_1);
    const interceptors2 = registry.getInterceptors(METADATA_KEY_2);

    expect(interceptors1.length).toBe(1);
    expect(interceptors1[0]).toBe(interceptor1);
    expect(interceptors2.length).toBe(1);
    expect(interceptors2[0]).toBe(interceptor2);
  });

  test('should return empty array for non-existent metadata key', () => {
    const interceptors = registry.getInterceptors(METADATA_KEY_1);
    expect(interceptors).toEqual([]);
  });

  test('should check if interceptor exists', () => {
    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    expect(registry.hasInterceptor(METADATA_KEY_1)).toBe(false);
    registry.register(METADATA_KEY_1, interceptor);
    expect(registry.hasInterceptor(METADATA_KEY_1)).toBe(true);
  });

  test('should clear all interceptors', () => {
    const interceptor1: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };
    const interceptor2: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    registry.register(METADATA_KEY_1, interceptor1);
    registry.register(METADATA_KEY_2, interceptor2);

    expect(registry.count()).toBe(2);
    registry.clear();
    expect(registry.count()).toBe(0);
    expect(registry.hasInterceptor(METADATA_KEY_1)).toBe(false);
    expect(registry.hasInterceptor(METADATA_KEY_2)).toBe(false);
  });

  test('should remove interceptors by metadata key', () => {
    const interceptor1: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };
    const interceptor2: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    registry.register(METADATA_KEY_1, interceptor1);
    registry.register(METADATA_KEY_2, interceptor2);

    expect(registry.count()).toBe(2);
    registry.remove(METADATA_KEY_1);
    expect(registry.count()).toBe(1);
    expect(registry.hasInterceptor(METADATA_KEY_1)).toBe(false);
    expect(registry.hasInterceptor(METADATA_KEY_2)).toBe(true);
  });

  test('should sort interceptors by priority', () => {
    const interceptor1: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };
    const interceptor2: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };
    const interceptor3: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    // 注册顺序：1(100), 2(50), 3(75)
    registry.register(METADATA_KEY_1, interceptor1, 100);
    registry.register(METADATA_KEY_1, interceptor2, 50);
    registry.register(METADATA_KEY_1, interceptor3, 75);

    const interceptors = registry.getInterceptors(METADATA_KEY_1);
    expect(interceptors.length).toBe(3);
    // 应该按优先级排序：50 < 75 < 100
    expect(interceptors[0]).toBe(interceptor2); // 50
    expect(interceptors[1]).toBe(interceptor3); // 75
    expect(interceptors[2]).toBe(interceptor1); // 100
  });

  test('should get all metadata keys', () => {
    const interceptor1: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };
    const interceptor2: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    registry.register(METADATA_KEY_1, interceptor1);
    registry.register(METADATA_KEY_2, interceptor2);

    const keys = Array.from(registry.getAllMetadataKeys());
    expect(keys.length).toBe(2);
    expect(keys).toContain(METADATA_KEY_1);
    expect(keys).toContain(METADATA_KEY_2);
  });
});

