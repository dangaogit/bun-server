import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { GET, POST } from '../../src/router/decorators';
import { Param } from '../../src/controller/decorators';
import { RouteRegistry } from '../../src/router/registry';
import {
  InterceptorRegistry,
  INTERCEPTOR_REGISTRY_TOKEN,
  BaseInterceptor,
} from '../../src/interceptor';
import type { Interceptor } from '../../src/interceptor';
import type { Container } from '../../src/di/container';
import type { Context } from '../../src/core/context';
import type { Middleware } from '../../src/middleware';
import { UseMiddleware } from '../../src/middleware';
import { getTestPort } from '../utils/test-port';

describe('Interceptor Advanced Integration', () => {
  let app: Application;
  let port: number;
  let interceptorRegistry: InterceptorRegistry;

  beforeEach(() => {
    port = getTestPort();
    app = new Application({ port });
    interceptorRegistry = app.getContainer().resolve<InterceptorRegistry>(
      INTERCEPTOR_REGISTRY_TOKEN,
    );
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
    interceptorRegistry.clear();
  });

  describe('Multiple Interceptors Combination', () => {
    test('should execute 5 interceptors in correct priority order', async () => {
      const METADATA_KEYS = [
        Symbol('test:1'),
        Symbol('test:2'),
        Symbol('test:3'),
        Symbol('test:4'),
        Symbol('test:5'),
      ];
      const executionOrder: number[] = [];

      // 创建装饰器
      function createDecorator(key: symbol, order: number): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(key, order, target, propertyKey);
        };
      }

      // 创建拦截器
      const interceptors: Interceptor[] = METADATA_KEYS.map((key, index) => ({
        async execute(target, propertyKey, originalMethod, args, container, context) {
          executionOrder.push(index + 1);
          return await Promise.resolve(originalMethod.apply(target, args));
        },
      }));

      // 注册拦截器（优先级：5, 4, 3, 2, 1）
      interceptors.forEach((interceptor, index) => {
        interceptorRegistry.register(METADATA_KEYS[index], interceptor, (index + 1) * 20);
      });

      @Controller('/api/test')
      class TestController {
        @GET('/')
        @createDecorator(METADATA_KEYS[0], 1)
        @createDecorator(METADATA_KEYS[1], 2)
        @createDecorator(METADATA_KEYS[2], 3)
        @createDecorator(METADATA_KEYS[3], 4)
        @createDecorator(METADATA_KEYS[4], 5)
        public test() {
          executionOrder.push(6);
          return { message: 'test' };
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('test');
      // 执行顺序：1 (20) -> 2 (40) -> 3 (60) -> 4 (80) -> 5 (100) -> method
      expect(executionOrder).toEqual([1, 2, 3, 4, 5, 6]);
    });

    test('should handle interceptors modifying return value', async () => {
      const METADATA_KEY = Symbol('test:modify-result');

      function CustomDecorator(): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
        };
      }

      const interceptor: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          // 执行原方法
          const result = await Promise.resolve(originalMethod.apply(target, args));
          // 修改返回值：将 result 字段乘以 2
          if (result && typeof result === 'object' && 'result' in result) {
            return { ...result, result: (result as any).result * 2 };
          }
          return result;
        },
      };

      interceptorRegistry.register(METADATA_KEY, interceptor);

      @Controller('/api/test')
      class TestController {
        @GET('/:value')
        @CustomDecorator()
        public test(@Param('value') value: string) {
          const num = Number.parseInt(value);
          return { original: num, result: num };
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test/5`);
      expect(response.status).toBe(200);
      const data = await response.json();
      // 拦截器将 result 从 5 改为 10
      expect(data.original).toBe(5);
      expect(data.result).toBe(10);
    });
  });

  describe('Interceptor and Middleware Interaction', () => {
    test('should execute middleware before interceptors', async () => {
      const METADATA_KEY = Symbol('test:middleware-order');
      const executionOrder: string[] = [];

      function CustomDecorator(): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
        };
      }

      // 创建中间件
      const middleware: Middleware = async (context, next) => {
        executionOrder.push('middleware');
        return await next();
      };

      // 创建拦截器
      const interceptor: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          executionOrder.push('interceptor');
          return await Promise.resolve(originalMethod.apply(target, args));
        },
      };

      interceptorRegistry.register(METADATA_KEY, interceptor);
      app.use(middleware);

      @Controller('/api/test')
      class TestController {
        @GET('/')
        @CustomDecorator()
        public test() {
          executionOrder.push('method');
          return { message: 'test' };
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(200);
      // 执行顺序：middleware -> interceptor -> method
      expect(executionOrder).toEqual(['middleware', 'interceptor', 'method']);
    });

    test('should execute class-level and method-level middleware with interceptors', async () => {
      const METADATA_KEY = Symbol('test:multi-middleware');
      const executionOrder: string[] = [];

      function CustomDecorator(): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
        };
      }

      // 创建多个中间件
      const globalMiddleware: Middleware = async (context, next) => {
        executionOrder.push('global-middleware');
        return await next();
      };

      const classMiddleware: Middleware = async (context, next) => {
        executionOrder.push('class-middleware');
        return await next();
      };

      const methodMiddleware: Middleware = async (context, next) => {
        executionOrder.push('method-middleware');
        return await next();
      };

      // 创建拦截器
      const interceptor: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          executionOrder.push('interceptor');
          return await Promise.resolve(originalMethod.apply(target, args));
        },
      };

      interceptorRegistry.register(METADATA_KEY, interceptor);
      app.use(globalMiddleware);

      @Controller('/api/test')
      @UseMiddleware(classMiddleware)
      class TestController {
        @GET('/')
        @UseMiddleware(methodMiddleware)
        @CustomDecorator()
        public test() {
          executionOrder.push('method');
          return { message: 'test' };
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(200);
      // 执行顺序：global -> class -> method -> interceptor -> method
      expect(executionOrder).toEqual([
        'global-middleware',
        'class-middleware',
        'method-middleware',
        'interceptor',
        'method',
      ]);
    });

    test('should handle middleware modifying context before interceptors', async () => {
      const METADATA_KEY = Symbol('test:context-modify');
      let interceptorReceivedHeader: string | null = null;

      function CustomDecorator(): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
        };
      }

      // 创建中间件，在上下文中存储数据
      const middleware: Middleware = async (context, next) => {
        // 使用自定义属性存储数据（中间件设置的 header 是响应头，拦截器无法读取）
        (context as any).customData = 'modified-by-middleware';
        return await next();
      };

      // 创建拦截器，读取上下文数据
      const interceptor: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          if (context) {
            interceptorReceivedHeader = (context as any).customData || null;
          }
          return await Promise.resolve(originalMethod.apply(target, args));
        },
      };

      interceptorRegistry.register(METADATA_KEY, interceptor);
      app.use(middleware);

      @Controller('/api/test')
      class TestController {
        @GET('/')
        @CustomDecorator()
        public test() {
          return { message: 'test' };
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(200);
      expect(interceptorReceivedHeader).toBe('modified-by-middleware');
    });
  });

  describe('Interceptor Error Handling', () => {
    test('should handle interceptor throwing error before method execution', async () => {
      const METADATA_KEY = Symbol('test:error-before');

      function CustomDecorator(): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
        };
      }

      const interceptor: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          throw new Error('Interceptor error before method');
        },
      };

      interceptorRegistry.register(METADATA_KEY, interceptor);

      @Controller('/api/test')
      class TestController {
        @GET('/')
        @CustomDecorator()
        public test() {
          return { message: 'test' };
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
    });

    test('should handle interceptor catching and transforming method error', async () => {
      const METADATA_KEY = Symbol('test:error-transform');

      function CustomDecorator(): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
        };
      }

      const interceptor: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          try {
            return await Promise.resolve(originalMethod.apply(target, args));
          } catch (error) {
            // 转换错误
            return { error: 'Transformed error', original: (error as Error).message };
          }
        },
      };

      interceptorRegistry.register(METADATA_KEY, interceptor);

      @Controller('/api/test')
      class TestController {
        @GET('/')
        @CustomDecorator()
        public test() {
          throw new Error('Original error');
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.error).toBe('Transformed error');
      expect(data.original).toBe('Original error');
    });

    test('should handle multiple interceptors with error in middle', async () => {
      const METADATA_KEY_1 = Symbol('test:error:1');
      const METADATA_KEY_2 = Symbol('test:error:2');
      const METADATA_KEY_3 = Symbol('test:error:3');
      const executionOrder: string[] = [];

      function createDecorator(key: symbol): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(key, true, target, propertyKey);
        };
      }

      const interceptor1: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          executionOrder.push('interceptor1');
          return await Promise.resolve(originalMethod.apply(target, args));
        },
      };

      const interceptor2: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          executionOrder.push('interceptor2');
          throw new Error('Error in interceptor2');
        },
      };

      const interceptor3: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          executionOrder.push('interceptor3');
          return await Promise.resolve(originalMethod.apply(target, args));
        },
      };

      interceptorRegistry.register(METADATA_KEY_1, interceptor1, 10);
      interceptorRegistry.register(METADATA_KEY_2, interceptor2, 20);
      interceptorRegistry.register(METADATA_KEY_3, interceptor3, 30);

      @Controller('/api/test')
      class TestController {
        @GET('/')
        @createDecorator(METADATA_KEY_1)
        @createDecorator(METADATA_KEY_2)
        @createDecorator(METADATA_KEY_3)
        public test() {
          executionOrder.push('method');
          return { message: 'test' };
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(500);
      // interceptor1 执行，interceptor2 抛出错误，interceptor3 和 method 不执行
      expect(executionOrder).toEqual(['interceptor1', 'interceptor2']);
    });

    test('should handle BaseInterceptor error handling', async () => {
      const METADATA_KEY = Symbol('test:base-error');

      function CustomDecorator(): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
        };
      }

      class ErrorHandlingInterceptor extends BaseInterceptor {
        public async execute<T>(
          target: unknown,
          propertyKey: string | symbol,
          originalMethod: (...args: unknown[]) => T | Promise<T>,
          args: unknown[],
          container: Container,
          context?: Context,
        ): Promise<T> {
          try {
            await this.before(target, propertyKey, args, container, context);
            const result = await Promise.resolve(originalMethod.apply(target, args));
            return await this.after(target, propertyKey, result, container, context) as T;
          } catch (error) {
            return await this.onError(target, propertyKey, error, container, context);
          }
        }

        protected async onError(
          target: unknown,
          propertyKey: string | symbol,
          error: unknown,
          container: Container,
          context?: Context,
        ): Promise<never> {
          // 转换错误为响应
          throw new Error(`Handled: ${(error as Error).message}`);
        }
      }

      const interceptor = new ErrorHandlingInterceptor();
      interceptorRegistry.register(METADATA_KEY, interceptor);

      @Controller('/api/test')
      class TestController {
        @GET('/')
        @CustomDecorator()
        public test() {
          throw new Error('Original error');
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.error).toBeDefined();
      // 错误应该被 BaseInterceptor 的 onError 处理
    });
  });

  describe('Complex Scenarios', () => {
    test('should handle interceptors with async operations', async () => {
      const METADATA_KEY = Symbol('test:async');

      function CustomDecorator(): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
        };
      }

      let asyncOperationCompleted = false;

      const interceptor: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          // 模拟异步操作
          await new Promise((resolve) => setTimeout(resolve, 10));
          asyncOperationCompleted = true;
          return await Promise.resolve(originalMethod.apply(target, args));
        },
      };

      interceptorRegistry.register(METADATA_KEY, interceptor);

      @Controller('/api/test')
      class TestController {
        @GET('/')
        @CustomDecorator()
        public async test() {
          return { message: 'test', asyncCompleted: asyncOperationCompleted };
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('test');
      expect(data.asyncCompleted).toBe(true);
    });

    test('should handle interceptors accessing container services', async () => {
      const METADATA_KEY = Symbol('test:container');

      function CustomDecorator(): MethodDecorator {
        return (target, propertyKey) => {
          Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
        };
      }

      class TestService {
        public getValue(): string {
          return 'service-value';
        }
      }

      const interceptor: Interceptor = {
        async execute(target, propertyKey, originalMethod, args, container, context) {
          // 从容器解析服务
          const service = container.resolve<TestService>(TestService);
          const value = service.getValue();
          const result = await Promise.resolve(originalMethod.apply(target, args));
          return { ...result, serviceValue: value };
        },
      };

      interceptorRegistry.register(METADATA_KEY, interceptor);

      // 注册服务到容器
      const container = ControllerRegistry.getInstance().getContainer();
      container.register(TestService);

      @Controller('/api/test')
      class TestController {
        @GET('/')
        @CustomDecorator()
        public test() {
          return { message: 'test' };
        }
      }

      app.registerController(TestController);
      await app.listen();

      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.message).toBe('test');
      expect(data.serviceValue).toBe('service-value');
    });
  });
});

