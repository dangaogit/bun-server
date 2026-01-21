import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { BaseInterceptor } from '../../src/interceptor/base-interceptor';
import { Container } from '../../src/di/container';
import { Context } from '../../src/core/context';

// 创建具体的测试拦截器实现
class TestInterceptor extends BaseInterceptor {
  public beforeCalled = false;
  public afterCalled = false;
  public onErrorCalled = false;
  public lastArgs: unknown[] = [];
  public lastResult: unknown;
  public lastError: unknown;

  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    await this.before(target, propertyKey, args, container, context);
    this.beforeCalled = true;
    this.lastArgs = args;

    try {
      const result = await Promise.resolve(originalMethod.apply(target, args));
      const processedResult = await this.after(target, propertyKey, result as T, container, context);
      this.afterCalled = true;
      this.lastResult = processedResult;
      return processedResult;
    } catch (error) {
      this.lastError = error;
      return await this.onError(target, propertyKey, error, container, context);
    }
  }
}

// 自定义前置处理的拦截器
class BeforeInterceptor extends BaseInterceptor {
  public modifiedArgs: unknown[] = [];

  protected async before(
    target: unknown,
    propertyKey: string | symbol,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<void> {
    // 记录参数
    this.modifiedArgs = [...args];
  }

  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    await this.before(target, propertyKey, args, container, context);
    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

// 自定义后置处理的拦截器
class AfterInterceptor extends BaseInterceptor {
  protected async after<T>(
    target: unknown,
    propertyKey: string | symbol,
    result: T,
    container: Container,
    context?: Context,
  ): Promise<T> {
    // 修改结果
    if (typeof result === 'number') {
      return (result * 2) as T;
    }
    return result;
  }

  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    const result = await Promise.resolve(originalMethod.apply(target, args));
    return await this.after(target, propertyKey, result as T, container, context);
  }
}

// 自定义错误处理的拦截器
class ErrorInterceptor extends BaseInterceptor {
  public errorHandled = false;
  public customErrorMessage = 'Custom error';

  protected async onError(
    target: unknown,
    propertyKey: string | symbol,
    error: unknown,
    container: Container,
    context?: Context,
  ): Promise<never> {
    this.errorHandled = true;
    throw new Error(this.customErrorMessage);
  }

  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    try {
      return await Promise.resolve(originalMethod.apply(target, args));
    } catch (error) {
      return await this.onError(target, propertyKey, error, container, context);
    }
  }
}

// 测试元数据的拦截器
const TEST_METADATA_KEY = Symbol('test:metadata');

class MetadataInterceptor extends BaseInterceptor {
  public foundMetadata: unknown;

  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    this.foundMetadata = this.getMetadata(target, propertyKey, TEST_METADATA_KEY);
    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

// 测试上下文辅助方法的拦截器
class ContextInterceptor extends BaseInterceptor {
  public contextValue: unknown;
  public headerValue: string | null = null;
  public queryValue: string | null = null;
  public paramValue: string | undefined;

  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    this.contextValue = this.getContextValue(context, 'testKey');
    this.headerValue = this.getHeader(context, 'x-test-header');
    this.queryValue = this.getQuery(context, 'testQuery');
    this.paramValue = this.getParam(context, 'id');
    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

// 测试服务解析的拦截器
class ServiceInterceptor extends BaseInterceptor {
  public resolvedService: unknown;

  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    this.resolvedService = this.resolveService(container, 'TestService');
    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

describe('BaseInterceptor', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('execute lifecycle', () => {
    test('should call before, execute method, and after', async () => {
      const interceptor = new TestInterceptor();
      const target = {
        method: (x: number) => x * 2,
      };

      const result = await interceptor.execute(
        target,
        'method',
        target.method.bind(target),
        [5],
        container,
      );

      expect(result).toBe(10);
      expect(interceptor.beforeCalled).toBe(true);
      expect(interceptor.afterCalled).toBe(true);
      expect(interceptor.lastArgs).toEqual([5]);
      expect(interceptor.lastResult).toBe(10);
    });

    test('should handle errors and call onError', async () => {
      const interceptor = new TestInterceptor();
      const target = {
        method: () => {
          throw new Error('Test error');
        },
      };

      await expect(
        interceptor.execute(
          target,
          'method',
          target.method.bind(target),
          [],
          container,
        ),
      ).rejects.toThrow('Test error');

      expect(interceptor.beforeCalled).toBe(true);
      expect(interceptor.lastError).toBeInstanceOf(Error);
    });
  });

  describe('before hook', () => {
    test('should allow custom before processing', async () => {
      const interceptor = new BeforeInterceptor();
      const target = {
        method: (a: number, b: string) => `${a}-${b}`,
      };

      await interceptor.execute(
        target,
        'method',
        target.method.bind(target),
        [42, 'test'],
        container,
      );

      expect(interceptor.modifiedArgs).toEqual([42, 'test']);
    });
  });

  describe('after hook', () => {
    test('should allow result transformation', async () => {
      const interceptor = new AfterInterceptor();
      const target = {
        method: () => 21,
      };

      const result = await interceptor.execute(
        target,
        'method',
        target.method.bind(target),
        [],
        container,
      );

      expect(result).toBe(42); // 21 * 2
    });

    test('should return original result for non-number types', async () => {
      const interceptor = new AfterInterceptor();
      const target = {
        method: () => 'hello',
      };

      const result = await interceptor.execute(
        target,
        'method',
        target.method.bind(target),
        [],
        container,
      );

      expect(result).toBe('hello');
    });
  });

  describe('onError hook', () => {
    test('should allow custom error handling', async () => {
      const interceptor = new ErrorInterceptor();
      const target = {
        method: () => {
          throw new Error('Original error');
        },
      };

      await expect(
        interceptor.execute(
          target,
          'method',
          target.method.bind(target),
          [],
          container,
        ),
      ).rejects.toThrow('Custom error');

      expect(interceptor.errorHandled).toBe(true);
    });
  });

  describe('getMetadata', () => {
    test('should get metadata from prototype', async () => {
      class TestClass {
        public testMethod(): string {
          return 'test';
        }
      }

      Reflect.defineMetadata(TEST_METADATA_KEY, { value: 'metadata' }, TestClass.prototype, 'testMethod');

      const interceptor = new MetadataInterceptor();
      const instance = new TestClass();

      await interceptor.execute(
        instance,
        'testMethod',
        instance.testMethod.bind(instance),
        [],
        container,
      );

      expect(interceptor.foundMetadata).toEqual({ value: 'metadata' });
    });

    test('should get metadata from instance when stored on instance', async () => {
      const instance = {
        testMethod: () => 'test',
      };

      Reflect.defineMetadata(TEST_METADATA_KEY, { value: 'instance-metadata' }, instance, 'testMethod');

      const interceptor = new MetadataInterceptor();

      await interceptor.execute(
        instance,
        'testMethod',
        instance.testMethod.bind(instance),
        [],
        container,
      );

      expect(interceptor.foundMetadata).toEqual({ value: 'instance-metadata' });
    });

    test('should return undefined for non-object target', async () => {
      const interceptor = new MetadataInterceptor();

      await interceptor.execute(
        null,
        'method',
        () => 'test',
        [],
        container,
      );

      expect(interceptor.foundMetadata).toBeUndefined();
    });

    test('should return undefined when metadata does not exist', async () => {
      class TestClass {
        public noMetadataMethod(): string {
          return 'test';
        }
      }

      const interceptor = new MetadataInterceptor();
      const instance = new TestClass();

      await interceptor.execute(
        instance,
        'noMetadataMethod',
        instance.noMetadataMethod.bind(instance),
        [],
        container,
      );

      expect(interceptor.foundMetadata).toBeUndefined();
    });

    test('should get metadata from constructor prototype as fallback', async () => {
      class TestClass {
        public testMethod(): string {
          return 'test';
        }
      }

      // 在构造函数原型上设置元数据
      Reflect.defineMetadata(TEST_METADATA_KEY, { value: 'constructor-metadata' }, TestClass.prototype, 'testMethod');

      const interceptor = new MetadataInterceptor();
      const instance = new TestClass();

      await interceptor.execute(
        instance,
        'testMethod',
        instance.testMethod.bind(instance),
        [],
        container,
      );

      expect(interceptor.foundMetadata).toEqual({ value: 'constructor-metadata' });
    });
  });

  describe('resolveService', () => {
    test('should resolve service from container using registerInstance', async () => {
      const TEST_SERVICE_TOKEN = Symbol('TestService');
      const testServiceInstance = { name: 'TestService' };

      // 使用 registerInstance 注册实例
      container.registerInstance(TEST_SERVICE_TOKEN, testServiceInstance);

      // 使用内联拦截器
      class LocalServiceInterceptor extends BaseInterceptor {
        public resolvedService: unknown;

        public async execute<T>(
          target: unknown,
          propertyKey: string | symbol,
          originalMethod: (...args: unknown[]) => T | Promise<T>,
          args: unknown[],
          container: Container,
          context?: Context,
        ): Promise<T> {
          this.resolvedService = this.resolveService(container, TEST_SERVICE_TOKEN);
          return await Promise.resolve(originalMethod.apply(target, args));
        }
      }

      const interceptor = new LocalServiceInterceptor();

      await interceptor.execute(
        {},
        'method',
        () => 'test',
        [],
        container,
      );

      expect(interceptor.resolvedService).toBe(testServiceInstance);
      expect((interceptor.resolvedService as { name: string }).name).toBe('TestService');
    });
  });

  describe('context helpers', () => {
    test('should return undefined/null when context is undefined', async () => {
      const interceptor = new ContextInterceptor();

      await interceptor.execute(
        {},
        'method',
        () => 'test',
        [],
        container,
        undefined,
      );

      expect(interceptor.contextValue).toBeUndefined();
      expect(interceptor.headerValue).toBeNull();
      expect(interceptor.queryValue).toBeNull();
      expect(interceptor.paramValue).toBeUndefined();
    });

    test('should get header from context', async () => {
      const request = new Request('http://localhost/test', {
        headers: {
          'x-test-header': 'test-value',
        },
      });
      const context = new Context(request);

      const interceptor = new ContextInterceptor();

      await interceptor.execute(
        {},
        'method',
        () => 'test',
        [],
        container,
        context,
      );

      expect(interceptor.headerValue).toBe('test-value');
    });

    test('should get query from context', async () => {
      const request = new Request('http://localhost/test?testQuery=queryValue');
      const context = new Context(request);

      const interceptor = new ContextInterceptor();

      await interceptor.execute(
        {},
        'method',
        () => 'test',
        [],
        container,
        context,
      );

      expect(interceptor.queryValue).toBe('queryValue');
    });

    test('should get param from context', async () => {
      const request = new Request('http://localhost/users/123');
      const context = new Context(request);
      // 直接设置 params 属性
      context.params = { id: '123' };

      const interceptor = new ContextInterceptor();

      await interceptor.execute(
        {},
        'method',
        () => 'test',
        [],
        container,
        context,
      );

      expect(interceptor.paramValue).toBe('123');
    });

    test('should return undefined for getContextValue (base implementation)', async () => {
      const request = new Request('http://localhost/test');
      const context = new Context(request);

      const interceptor = new ContextInterceptor();

      await interceptor.execute(
        {},
        'method',
        () => 'test',
        [],
        container,
        context,
      );

      // getContextValue 的基础实现总是返回 undefined
      expect(interceptor.contextValue).toBeUndefined();
    });
  });

  describe('async method handling', () => {
    test('should handle async original method', async () => {
      const interceptor = new TestInterceptor();
      const target = {
        asyncMethod: async (x: number) => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          return x * 3;
        },
      };

      const result = await interceptor.execute(
        target,
        'asyncMethod',
        target.asyncMethod.bind(target),
        [7],
        container,
      );

      expect(result).toBe(21);
      expect(interceptor.afterCalled).toBe(true);
    });

    test('should handle async method that throws', async () => {
      const interceptor = new TestInterceptor();
      const target = {
        asyncMethod: async () => {
          await new Promise((resolve) => setTimeout(resolve, 10));
          throw new Error('Async error');
        },
      };

      await expect(
        interceptor.execute(
          target,
          'asyncMethod',
          target.asyncMethod.bind(target),
          [],
          container,
        ),
      ).rejects.toThrow('Async error');
    });
  });
});
