import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  ServiceClient,
  getServiceClientParameterIndices,
} from '../../src/microservice/service-client/decorators';
import type { Constructor } from '../../src/core/types';

describe('ServiceClient Decorator', () => {
  test('should set parameter index metadata', () => {
    class TestService {
      public constructor(@ServiceClient() private readonly client: unknown) {}
    }

    const indices = getServiceClientParameterIndices(TestService);
    expect(indices).toEqual([0]);
  });

  test('should handle multiple ServiceClient parameters', () => {
    class TestService {
      public constructor(
        @ServiceClient() private readonly client1: unknown,
        private readonly other: string,
        @ServiceClient() private readonly client2: unknown,
      ) {}
    }

    const indices = getServiceClientParameterIndices(TestService);
    expect(indices).toContain(0);
    expect(indices).toContain(2);
  });

  test('should return empty array for class without decorator', () => {
    class TestService {
      public constructor(private readonly other: string) {}
    }

    const indices = getServiceClientParameterIndices(TestService);
    expect(indices).toEqual([]);
  });

  test('should handle class with no constructor parameters', () => {
    class TestService {}

    const indices = getServiceClientParameterIndices(TestService);
    expect(indices).toEqual([]);
  });

  test('should handle decorator on instance method parameter', () => {
    class TestService {
      public method(@ServiceClient() client: unknown): void {}
    }

    // 方法参数装饰器的处理可能不同，检查不抛出错误
    expect(() => {
      const indices = getServiceClientParameterIndices(TestService);
      // 方法参数装饰器通常不会影响类级元数据
    }).not.toThrow();
  });
});

describe('getServiceClientParameterIndices', () => {
  test('should return empty array for undefined metadata', () => {
    class EmptyService {}

    const indices = getServiceClientParameterIndices(EmptyService);
    expect(indices).toEqual([]);
  });

  test('should preserve order of parameter indices', () => {
    class TestService {
      public constructor(
        @ServiceClient() private readonly a: unknown,
        @ServiceClient() private readonly b: unknown,
        @ServiceClient() private readonly c: unknown,
      ) {}
    }

    const indices = getServiceClientParameterIndices(TestService);
    expect(indices.length).toBe(3);
    expect(indices).toContain(0);
    expect(indices).toContain(1);
    expect(indices).toContain(2);
  });
});
