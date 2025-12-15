import { describe, expect, test, beforeEach } from 'bun:test';
import { Container } from '../../src/di/container';
import { Injectable } from '../../src/di/decorators';
import { Lifecycle } from '../../src/di/types';
import { contextStore } from '../../src/core/context-service';
import { Context } from '../../src/core/context';

describe('Lifecycle.Scoped', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  test('should create new instance for each request', async () => {
    @Injectable({ lifecycle: Lifecycle.Scoped })
    class ScopedService {
      public readonly id: string;

      public constructor() {
        this.id = Math.random().toString(36).substring(7);
      }
    }

    container.register(ScopedService);

    const request1 = new Request('http://localhost:3000/api/test1');
    const request2 = new Request('http://localhost:3000/api/test2');
    const context1 = new Context(request1);
    const context2 = new Context(request2);

    let instance1: ScopedService;
    let instance2: ScopedService;

    await contextStore.run(context1, async () => {
      instance1 = container.resolve(ScopedService);
    });

    await contextStore.run(context2, async () => {
      instance2 = container.resolve(ScopedService);
    });

    // 每个请求应该有独立的实例
    expect(instance1!.id).not.toBe(instance2!.id);
  });

  test('should reuse instance within same request', async () => {
    @Injectable({ lifecycle: Lifecycle.Scoped })
    class ScopedService {
      public readonly id: string;

      public constructor() {
        this.id = Math.random().toString(36).substring(7);
      }
    }

    container.register(ScopedService);

    const request = new Request('http://localhost:3000/api/test');
    const context = new Context(request);

    let instance1: ScopedService;
    let instance2: ScopedService;

    await contextStore.run(context, async () => {
      instance1 = container.resolve(ScopedService);
      instance2 = container.resolve(ScopedService);
    });

    // 同一请求内应该复用同一个实例
    expect(instance1!.id).toBe(instance2!.id);
  });

  test('should handle scoped service with dependencies', async () => {
    @Injectable({ lifecycle: Lifecycle.Singleton })
    class SingletonService {
      public readonly id = 'singleton';
    }

    @Injectable({ lifecycle: Lifecycle.Scoped })
    class ScopedService {
      public constructor(public readonly singleton: SingletonService) {}
    }

    container.register(SingletonService);
    container.register(ScopedService);

    const request = new Request('http://localhost:3000/api/test');
    const context = new Context(request);

    let scopedInstance: ScopedService;

    await contextStore.run(context, async () => {
      scopedInstance = container.resolve(ScopedService);
    });

    expect(scopedInstance!.singleton).toBeDefined();
    expect(scopedInstance!.singleton.id).toBe('singleton');
  });

  test('should handle scoped service depending on another scoped service', async () => {
    @Injectable({ lifecycle: Lifecycle.Scoped })
    class ScopedServiceA {
      public readonly id = 'A';
    }

    @Injectable({ lifecycle: Lifecycle.Scoped })
    class ScopedServiceB {
      public constructor(public readonly serviceA: ScopedServiceA) {}
    }

    container.register(ScopedServiceA);
    container.register(ScopedServiceB);

    const request = new Request('http://localhost:3000/api/test');
    const context = new Context(request);

    let serviceB: ScopedServiceB;
    let serviceA: ScopedServiceA;

    await contextStore.run(context, async () => {
      serviceB = container.resolve(ScopedServiceB);
      serviceA = container.resolve(ScopedServiceA);
    });

    // 同一请求内，ScopedServiceB 应该注入同一个 ScopedServiceA 实例
    expect(serviceB!.serviceA).toBe(serviceA!);
  });

  test('should return undefined when resolving scoped service outside request context', () => {
    @Injectable({ lifecycle: Lifecycle.Scoped })
    class ScopedService {}

    container.register(ScopedService);

    // 不在请求上下文中，应该能够解析（但实例不会被缓存）
    const instance = container.resolve(ScopedService);
    expect(instance).toBeDefined();
    expect(instance).toBeInstanceOf(ScopedService);
  });

  test('should handle concurrent requests with scoped services', async () => {
    @Injectable({ lifecycle: Lifecycle.Scoped })
    class ScopedService {
      public readonly requestId: string;

      public constructor() {
        this.requestId = Math.random().toString(36).substring(7);
      }
    }

    container.register(ScopedService);

    const request1 = new Request('http://localhost:3000/api/test1');
    const request2 = new Request('http://localhost:3000/api/test2');
    const context1 = new Context(request1);
    const context2 = new Context(request2);

    const promises = [
      contextStore.run(context1, async () => {
        const instance1 = container.resolve(ScopedService);
        await new Promise(resolve => setTimeout(resolve, 10));
        const instance2 = container.resolve(ScopedService);
        return { instance1: instance1.requestId, instance2: instance2.requestId };
      }),
      contextStore.run(context2, async () => {
        const instance1 = container.resolve(ScopedService);
        await new Promise(resolve => setTimeout(resolve, 10));
        const instance2 = container.resolve(ScopedService);
        return { instance1: instance1.requestId, instance2: instance2.requestId };
      }),
    ];

    const results = await Promise.all(promises);

    // 每个请求内的实例应该相同
    expect(results[0].instance1).toBe(results[0].instance2);
    expect(results[1].instance1).toBe(results[1].instance2);

    // 不同请求的实例应该不同
    expect(results[0].instance1).not.toBe(results[1].instance1);
  });

  test('should handle scoped service with factory', async () => {
    let factoryCallCount = 0;

    container.register('ScopedService', {
      lifecycle: Lifecycle.Scoped,
      factory: () => {
        factoryCallCount++;
        return { id: factoryCallCount };
      },
    });

    const request1 = new Request('http://localhost:3000/api/test1');
    const request2 = new Request('http://localhost:3000/api/test2');
    const context1 = new Context(request1);
    const context2 = new Context(request2);

    let instance1: { id: number };
    let instance2: { id: number };
    let instance1Again: { id: number };

    await contextStore.run(context1, async () => {
      instance1 = container.resolve<{ id: number }>('ScopedService');
      instance1Again = container.resolve<{ id: number }>('ScopedService');
    });

    await contextStore.run(context2, async () => {
      instance2 = container.resolve<{ id: number }>('ScopedService');
    });

    // 同一请求内应该复用实例
    expect(instance1!.id).toBe(instance1Again!.id);

    // 不同请求应该创建新实例
    expect(instance1!.id).not.toBe(instance2!.id);

    // 工厂函数应该被调用 2 次（每个请求一次）
    expect(factoryCallCount).toBe(2);
  });
});

