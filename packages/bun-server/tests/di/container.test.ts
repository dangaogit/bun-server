import 'reflect-metadata';
import { describe, expect, test, beforeEach } from 'bun:test';
import { Container } from '../../src/di/container';
import { Lifecycle } from '../../src/di/types';
import { Injectable, Inject } from '../../src/di/decorators';
import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { GET } from '../../src/router/decorators';
import { RouteRegistry } from '../../src/router/registry';
import { Context } from '../../src/core/context';

describe('Container', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  test('should create container instance', () => {
    expect(container).toBeInstanceOf(Container);
  });

  test('should register and resolve singleton', () => {
    class TestService {
      public value = 'test';
    }

    container.register(TestService, { lifecycle: Lifecycle.Singleton });

    const instance1 = container.resolve(TestService);
    const instance2 = container.resolve(TestService);

    expect(instance1).toBe(instance2);
    expect(instance1.value).toBe('test');
  });

  test('should register and resolve transient', () => {
    class TestService {
      public value = 'test';
    }

    container.register(TestService, { lifecycle: Lifecycle.Transient });

    const instance1 = container.resolve(TestService);
    const instance2 = container.resolve(TestService);

    expect(instance1).not.toBe(instance2);
    expect(instance1.value).toBe('test');
    expect(instance2.value).toBe('test');
  });

  test('should resolve with constructor injection', () => {
    @Injectable()
    class Dependency {
      public name = 'dependency';
    }

    @Injectable()
    class Service {
      public dependency: Dependency;

      public constructor(@Inject(Dependency) dependency: Dependency) {
        this.dependency = dependency;
      }
    }

    container.register(Dependency);
    container.register(Service);

    const service = container.resolve(Service);

    expect(service).toBeInstanceOf(Service);
    expect(service.dependency).toBeInstanceOf(Dependency);
    expect(service.dependency.name).toBe('dependency');
  });

  test('should resolve nested dependencies', () => {
    @Injectable()
    class Level1 {
      public name = 'level1';
    }

    @Injectable()
    class Level2 {
      public level1: Level1;

      public constructor(@Inject(Level1) level1: Level1) {
        this.level1 = level1;
      }
    }

    @Injectable()
    class Level3 {
      public level2: Level2;

      public constructor(@Inject(Level2) level2: Level2) {
        this.level2 = level2;
      }
    }

    container.register(Level1);
    container.register(Level2);
    container.register(Level3);

    const level3 = container.resolve(Level3);

    expect(level3).toBeInstanceOf(Level3);
    expect(level3.level2).toBeInstanceOf(Level2);
    expect(level3.level2.level1).toBeInstanceOf(Level1);
    expect(level3.level2.level1.name).toBe('level1');
  });

  test('should resolve dependency without explicit registration when constructor has no deps', () => {
    @Injectable()
    class PlainService {
      public id = 'plain';
    }

    @Injectable()
    class Consumer {
      public constructor(public readonly service: PlainService) {}
    }

    container.register(Consumer);

    const consumer = container.resolve(Consumer);
    expect(consumer.service).toBeInstanceOf(PlainService);
    expect(consumer.service.id).toBe('plain');
  });

  test('should use factory function', () => {
    class TestService {
      public value: string;

      public constructor(value: string) {
        this.value = value;
      }
    }

    container.register(TestService, {
      factory: () => new TestService('factory-created'),
    });

    const instance = container.resolve(TestService);

    expect(instance).toBeInstanceOf(TestService);
    expect(instance.value).toBe('factory-created');
  });

  test('should register and resolve instance', () => {
    class TestService {
      public value = 'pre-created';
    }

    const instance = new TestService();
    container.registerInstance(TestService, instance);

    const resolved = container.resolve(TestService);

    expect(resolved).toBe(instance);
    expect(resolved.value).toBe('pre-created');
  });

  test('should resolve dependencies registered in container via controller registry', () => {
    @Injectable()
    class Service {
      public id = 'service';
    }

    @Injectable()
    class Controller {
      public constructor(@Inject(Service) public readonly service: Service) {}
    }

    container.register(Service);
    container.register(Controller);

    const instance = container.resolve(Controller);
    expect(instance.service).toBeInstanceOf(Service);
    expect(instance.service.id).toBe('service');
  });

  test('should resolve service when controller registered through registry', async () => {
    @Injectable()
    class Service {
      public name = 'svc';
    }

    @Controller('/test-di')
    class TestController {
      public constructor(@Inject(Service) public readonly svc: Service) {}

      @GET('/')
      public get() {
        return this.svc.name;
      }
    }

    const controllerRegistry = ControllerRegistry.getInstance();
    const routeRegistry = RouteRegistry.getInstance();
    controllerRegistry.clear();
    routeRegistry.clear();
    controllerRegistry.getContainer().register(Service);
    controllerRegistry.register(TestController);

    const router = routeRegistry.getRouter();
    const request = new Request('http://localhost/test-di');
    const context = new Context(request);

    const response = await router.handle(context);
    expect(response?.status).toBe(200);
    expect(await response?.text()).toBe('svc');
    controllerRegistry.clear();
    routeRegistry.clear();
  });

  test('should check if registered', () => {
    class TestService {}

    expect(container.isRegistered(TestService)).toBe(false);

    container.register(TestService);

    expect(container.isRegistered(TestService)).toBe(true);
  });

  test('should clear all registrations', () => {
    class TestService {}

    container.register(TestService);
    expect(container.isRegistered(TestService)).toBe(true);

    container.clear();
    expect(container.isRegistered(TestService)).toBe(false);
  });

  test('should throw error for unregistered provider with dependencies', () => {
    @Injectable()
    class Dependency {}
    
    @Injectable()
    class UnregisteredService {
      public constructor(@Inject() dependency: Dependency) {}
    }

    // 只注册 Dependency，不注册 UnregisteredService
    container.register(Dependency);

    // 尝试解析未注册的服务，应该抛出错误
    expect(() => {
      container.resolve(UnregisteredService);
    }).toThrow('Provider not found');
  });

  // 注意：循环依赖测试暂时跳过
  // 因为类定义时的循环引用会导致编译错误
  // 循环依赖检测可以在后续版本中实现
  // test('should handle circular dependencies', () => {
  //   // 循环依赖会导致无限递归，实际使用中应该避免
  // });
});

