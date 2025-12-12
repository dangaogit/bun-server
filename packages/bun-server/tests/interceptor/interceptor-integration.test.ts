import 'reflect-metadata';
import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { GET } from '../../src/router/decorators';
import { RouteRegistry } from '../../src/router/registry';
import {
  InterceptorRegistry,
  INTERCEPTOR_REGISTRY_TOKEN,
  InterceptorChain,
  BaseInterceptor,
} from '../../src/interceptor';
import type { Interceptor } from '../../src/interceptor';
import { getTestPort } from '../utils/test-port';

describe('Interceptor Integration', () => {
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

  test('should execute custom interceptor', async () => {
    const METADATA_KEY = Symbol('test:custom');
    let interceptorExecuted = false;

    // 创建自定义装饰器
    function CustomDecorator(): MethodDecorator {
      return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
      };
    }

    // 创建拦截器
    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        interceptorExecuted = true;
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    // 注册拦截器
    interceptorRegistry.register(METADATA_KEY, interceptor);

    // 创建控制器
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
    expect(interceptorExecuted).toBe(true);
  });

  test('should execute multiple interceptors in chain', async () => {
    const METADATA_KEY_1 = Symbol('test:custom:1');
    const METADATA_KEY_2 = Symbol('test:custom:2');
    const executionOrder: string[] = [];

    // 创建自定义装饰器
    function CustomDecorator1(): MethodDecorator {
      return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata(METADATA_KEY_1, true, target, propertyKey);
      };
    }

    function CustomDecorator2(): MethodDecorator {
      return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata(METADATA_KEY_2, true, target, propertyKey);
      };
    }

    // 创建拦截器
    const interceptor1: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        executionOrder.push('interceptor1');
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    const interceptor2: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        executionOrder.push('interceptor2');
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    // 注册拦截器（interceptor2 优先级更高）
    interceptorRegistry.register(METADATA_KEY_1, interceptor1, 100);
    interceptorRegistry.register(METADATA_KEY_2, interceptor2, 50);

    // 创建控制器
    @Controller('/api/test')
    class TestController {
      @GET('/')
      @CustomDecorator1()
      @CustomDecorator2()
      public test() {
        executionOrder.push('method');
        return { message: 'test' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/test`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('test');
    // 执行顺序：interceptor2 (50) -> interceptor1 (100) -> method
    expect(executionOrder).toEqual(['interceptor2', 'interceptor1', 'method']);
  });

  test('should work without interceptors (backward compatibility)', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/')
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
  });

  test('should handle interceptor modifying result', async () => {
    const METADATA_KEY = Symbol('test:modify');

    function CustomDecorator(): MethodDecorator {
      return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
      };
    }

    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        const result = await Promise.resolve(originalMethod.apply(target, args));
        // 修改结果
        return { ...result, modified: true };
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
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('test');
    expect(data.modified).toBe(true);
  });

  test('should handle interceptor error', async () => {
    const METADATA_KEY = Symbol('test:error');

    function CustomDecorator(): MethodDecorator {
      return (target, propertyKey, descriptor) => {
        Reflect.defineMetadata(METADATA_KEY, true, target, propertyKey);
      };
    }

    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        throw new Error('Interceptor error');
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
    // 错误应该被全局错误处理器处理
    expect(response.status).toBe(500);
  });
});

