import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { scanInterceptorMetadata } from '../../src/interceptor/metadata';
import { InterceptorRegistry } from '../../src/interceptor/interceptor-registry';
import type { Interceptor } from '../../src/interceptor/types';
import type { Container } from '../../src/di/container';
import type { Context } from '../../src/core/context';

// 创建测试用的拦截器
class TestInterceptor1 implements Interceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

class TestInterceptor2 implements Interceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

// 测试用的元数据键
const TEST_METADATA_KEY_1 = Symbol('test:interceptor:1');
const TEST_METADATA_KEY_2 = Symbol('test:interceptor:2');

describe('scanInterceptorMetadata', () => {
  let registry: InterceptorRegistry;
  let interceptor1: TestInterceptor1;
  let interceptor2: TestInterceptor2;

  beforeEach(() => {
    registry = new InterceptorRegistry();
    interceptor1 = new TestInterceptor1();
    interceptor2 = new TestInterceptor2();
  });

  test('should return empty array when no interceptors registered', () => {
    class TestClass {
      public testMethod(): void {}
    }

    const interceptors = scanInterceptorMetadata(
      TestClass.prototype,
      'testMethod',
      registry,
    );

    expect(interceptors).toEqual([]);
  });

  test('should return empty array when method has no matching metadata', () => {
    // 注册拦截器
    registry.register(TEST_METADATA_KEY_1, interceptor1);

    class TestClass {
      public testMethod(): void {}
    }

    // 方法没有 TEST_METADATA_KEY_1 元数据
    const interceptors = scanInterceptorMetadata(
      TestClass.prototype,
      'testMethod',
      registry,
    );

    expect(interceptors).toEqual([]);
  });

  test('should return interceptor when method has matching metadata', () => {
    // 注册拦截器
    registry.register(TEST_METADATA_KEY_1, interceptor1);

    class TestClass {
      public testMethod(): void {}
    }

    // 在方法上设置元数据
    Reflect.defineMetadata(
      TEST_METADATA_KEY_1,
      { value: 'test' },
      TestClass.prototype,
      'testMethod',
    );

    const interceptors = scanInterceptorMetadata(
      TestClass.prototype,
      'testMethod',
      registry,
    );

    expect(interceptors.length).toBe(1);
    expect(interceptors[0]).toBe(interceptor1);
  });

  test('should return multiple interceptors sorted by priority', () => {
    // 注册拦截器，interceptor2 优先级更高（数字更小）
    registry.register(TEST_METADATA_KEY_1, interceptor1, { priority: 20 });
    registry.register(TEST_METADATA_KEY_2, interceptor2, { priority: 10 });

    class TestClass {
      public testMethod(): void {}
    }

    // 在方法上设置两个元数据
    Reflect.defineMetadata(
      TEST_METADATA_KEY_1,
      { value: 'test1' },
      TestClass.prototype,
      'testMethod',
    );
    Reflect.defineMetadata(
      TEST_METADATA_KEY_2,
      { value: 'test2' },
      TestClass.prototype,
      'testMethod',
    );

    const interceptors = scanInterceptorMetadata(
      TestClass.prototype,
      'testMethod',
      registry,
    );

    expect(interceptors.length).toBe(2);
    // 两个拦截器都应该存在
    expect(interceptors).toContain(interceptor1);
    expect(interceptors).toContain(interceptor2);
  });

  test('should only return interceptors for matching metadata', () => {
    const unmatchedKey = Symbol('unmatched');
    registry.register(TEST_METADATA_KEY_1, interceptor1);
    registry.register(unmatchedKey, interceptor2);

    class TestClass {
      public testMethod(): void {}
    }

    // 只设置 TEST_METADATA_KEY_1 元数据
    Reflect.defineMetadata(
      TEST_METADATA_KEY_1,
      { value: 'test' },
      TestClass.prototype,
      'testMethod',
    );

    const interceptors = scanInterceptorMetadata(
      TestClass.prototype,
      'testMethod',
      registry,
    );

    expect(interceptors.length).toBe(1);
    expect(interceptors[0]).toBe(interceptor1);
  });

  test('should handle null metadata value', () => {
    registry.register(TEST_METADATA_KEY_1, interceptor1);

    class TestClass {
      public testMethod(): void {}
    }

    // 设置 null 值的元数据
    Reflect.defineMetadata(
      TEST_METADATA_KEY_1,
      null,
      TestClass.prototype,
      'testMethod',
    );

    const interceptors = scanInterceptorMetadata(
      TestClass.prototype,
      'testMethod',
      registry,
    );

    // null 值应该被忽略
    expect(interceptors).toEqual([]);
  });

  test('should handle symbol property key', () => {
    registry.register(TEST_METADATA_KEY_1, interceptor1);

    const methodKey = Symbol('symbolMethod');

    class TestClass {
      public [methodKey](): void {}
    }

    Reflect.defineMetadata(
      TEST_METADATA_KEY_1,
      { value: 'test' },
      TestClass.prototype,
      methodKey,
    );

    const interceptors = scanInterceptorMetadata(
      TestClass.prototype,
      methodKey,
      registry,
    );

    expect(interceptors.length).toBe(1);
  });
});
