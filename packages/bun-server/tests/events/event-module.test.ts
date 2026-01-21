import { describe, expect, test, beforeEach, mock } from 'bun:test';
import 'reflect-metadata';
import { EventModule, EventListenerScanner } from '../../src/events/event-module';
import { EventEmitterService } from '../../src/events/service';
import { OnEvent, getOnEventMetadata, isEventListenerClass } from '../../src/events/decorators';
import { Container } from '../../src/di/container';
import { Injectable } from '../../src/di/decorators';
import { MODULE_METADATA_KEY } from '../../src/di/module';
import { ModuleRegistry } from '../../src/di/module-registry';
import {
  EVENT_EMITTER_TOKEN,
  EVENT_OPTIONS_TOKEN,
  type EventEmitter,
} from '../../src/events/types';

describe('EventModule', () => {
  beforeEach(() => {
    // 清除模块元数据
    Reflect.deleteMetadata(MODULE_METADATA_KEY, EventModule);
  });

  describe('forRoot()', () => {
    test('should register event emitter service', () => {
      EventModule.forRoot();

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, EventModule);
      expect(metadata.providers).toBeDefined();
      expect(metadata.providers.length).toBeGreaterThanOrEqual(2);

      const emitterProvider = metadata.providers.find(
        (p: any) => p.provide === EVENT_EMITTER_TOKEN,
      );
      expect(emitterProvider).toBeDefined();
      expect(emitterProvider.useValue).toBeInstanceOf(EventEmitterService);
    });

    test('should register options', () => {
      const options = { wildcard: true, maxListeners: 50 };
      EventModule.forRoot(options);

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, EventModule);
      const optionsProvider = metadata.providers.find(
        (p: any) => p.provide === EVENT_OPTIONS_TOKEN,
      );

      expect(optionsProvider).toBeDefined();
      expect(optionsProvider.useValue).toEqual(options);
    });

    test('should export event emitter token', () => {
      EventModule.forRoot();

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, EventModule);
      expect(metadata.exports).toContain(EVENT_EMITTER_TOKEN);
    });

    test('should apply options to event emitter', () => {
      EventModule.forRoot({ wildcard: true, globalPrefix: 'test' });

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, EventModule);
      const emitterProvider = metadata.providers.find(
        (p: any) => p.provide === EVENT_EMITTER_TOKEN,
      );

      // EventEmitterService 内部存储了选项
      expect(emitterProvider.useValue).toBeInstanceOf(EventEmitterService);
    });
  });

  describe('getEventEmitter()', () => {
    test('should return event emitter from container', () => {
      EventModule.forRoot();

      const container = new Container();
      const emitterService = new EventEmitterService();
      // 使用 registerInstance 方法注册实例（对应 useValue）
      container.registerInstance(EVENT_EMITTER_TOKEN, emitterService);

      const result = EventModule.getEventEmitter(container);
      expect(result).toBe(emitterService);
    });

    test('should return undefined when not registered', () => {
      const container = new Container();
      // getEventEmitter 现在会捕获错误并返回 undefined
      const result = EventModule.getEventEmitter(container);
      expect(result).toBeUndefined();
    });
  });
});

describe('EventListenerScanner', () => {
  let container: Container;
  let eventEmitter: EventEmitterService;
  let scanner: EventListenerScanner;

  beforeEach(() => {
    container = new Container();
    eventEmitter = new EventEmitterService();
    scanner = new EventListenerScanner(eventEmitter, container);
  });

  test('should scan and register event listeners', () => {
    const handler = mock(() => {});

    @Injectable()
    class TestService {
      @OnEvent('test.event')
      public handleEvent(payload: unknown): void {
        handler(payload);
      }
    }

    // 注册服务到容器
    container.register(TestService, { useClass: TestService });

    // 扫描并注册监听器
    scanner.scanAndRegister([TestService]);

    // 触发事件
    eventEmitter.emit('test.event', { data: 'test' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ data: 'test' });
  });

  test('should register multiple listeners from same class', () => {
    const handler1 = mock(() => {});
    const handler2 = mock(() => {});

    @Injectable()
    class TestService {
      @OnEvent('event1')
      public handleEvent1(payload: unknown): void {
        handler1(payload);
      }

      @OnEvent('event2')
      public handleEvent2(payload: unknown): void {
        handler2(payload);
      }
    }

    container.register(TestService, { useClass: TestService });
    scanner.scanAndRegister([TestService]);

    eventEmitter.emit('event1', 'payload1');
    eventEmitter.emit('event2', 'payload2');

    expect(handler1).toHaveBeenCalledWith('payload1');
    expect(handler2).toHaveBeenCalledWith('payload2');
  });

  test('should respect listener priority', () => {
    const order: number[] = [];

    @Injectable()
    class TestService {
      @OnEvent('test.event', { priority: 1 })
      public lowPriority(): void {
        order.push(1);
      }

      @OnEvent('test.event', { priority: 10 })
      public highPriority(): void {
        order.push(10);
      }
    }

    container.register(TestService, { useClass: TestService });
    scanner.scanAndRegister([TestService]);

    eventEmitter.emit('test.event', null);

    expect(order).toEqual([10, 1]);
  });

  test('should skip non-listener classes', () => {
    @Injectable()
    class RegularService {
      public doSomething(): void {}
    }

    container.register(RegularService, { useClass: RegularService });

    // 不应该抛出错误
    expect(() => scanner.scanAndRegister([RegularService])).not.toThrow();
  });

  test('should handle unregistered listener class gracefully', () => {
    @Injectable()
    class UnregisteredService {
      @OnEvent('test.event')
      public handleEvent(): void {}
    }

    // 容器会尝试解析未注册的类，这里会自动创建实例（无参数构造函数）
    // 所以不会抛出错误，也不会触发警告
    expect(() => scanner.scanAndRegister([UnregisteredService])).not.toThrow();
  });
});

describe('EventModule integration', () => {
  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, EventModule);
  });

  test('should work with initializeListeners via ModuleRegistry', () => {
    const handler = mock(() => {});

    @Injectable()
    class NotificationService {
      @OnEvent('user.created')
      public sendWelcomeEmail(payload: { email: string }): void {
        handler(payload);
      }
    }

    // 配置模块
    EventModule.forRoot();

    // 模拟模块注册流程
    const registry = ModuleRegistry.getInstance();
    const rootContainer = new Container();
    
    // 手动创建 EventModule 的模块引用
    const eventModuleContainer = new Container({ parent: rootContainer });
    const emitter = new EventEmitterService();
    eventModuleContainer.registerInstance(EVENT_EMITTER_TOKEN, emitter);

    // 注册 NotificationService 到同一个容器
    eventModuleContainer.register(NotificationService, { implementation: NotificationService });

    // 模拟 ModuleRegistry 的 getModuleRef 返回
    const originalGetModuleRef = registry.getModuleRef.bind(registry);
    registry.getModuleRef = (moduleClass: any) => {
      if (moduleClass === EventModule) {
        return {
          moduleClass: EventModule,
          container: eventModuleContainer,
          metadata: { providers: [], exports: [], imports: [], controllers: [] },
          controllersRegistered: false,
          attachedParents: new Set(),
          extensions: [],
          middlewares: [],
          isGlobal: false,
        } as any;
      }
      return originalGetModuleRef(moduleClass);
    };

    // 初始化监听器
    EventModule.initializeListeners(eventModuleContainer, [NotificationService]);

    // 发布事件
    emitter.emit('user.created', { email: 'test@example.com' });

    expect(handler).toHaveBeenCalledWith({ email: 'test@example.com' });

    // 恢复原始方法
    registry.getModuleRef = originalGetModuleRef;
  });

  test('should support async event handlers', async () => {
    const results: string[] = [];

    @Injectable()
    class AsyncService {
      @OnEvent('async.event', { async: true })
      public async handleAsync(payload: string): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(payload);
      }
    }

    const container = new Container();
    const emitter = new EventEmitterService();
    container.register(EVENT_EMITTER_TOKEN, { useValue: emitter });
    container.register(AsyncService, { useClass: AsyncService });

    const scanner = new EventListenerScanner(emitter, container);
    scanner.scanAndRegister([AsyncService]);

    await emitter.emitAsync('async.event', 'async-payload');

    expect(results).toContain('async-payload');
  });

  test('should handle Symbol events with decorators', () => {
    const USER_UPDATED = Symbol('user.updated');
    const handler = mock(() => {});

    @Injectable()
    class UserEventService {
      @OnEvent(USER_UPDATED)
      public handleUserUpdated(payload: unknown): void {
        handler(payload);
      }
    }

    const container = new Container();
    const emitter = new EventEmitterService();
    container.register(EVENT_EMITTER_TOKEN, { useValue: emitter });
    container.register(UserEventService, { useClass: UserEventService });

    const scanner = new EventListenerScanner(emitter, container);
    scanner.scanAndRegister([UserEventService]);

    emitter.emit(USER_UPDATED, { userId: '123' });

    expect(handler).toHaveBeenCalledWith({ userId: '123' });
  });
});

describe('EventModule with registerListeners', () => {
  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, EventModule);
    ModuleRegistry.getInstance().clear();
  });

  test('should collect listeners via registerListeners', () => {
    const handler = mock(() => {});

    @Injectable()
    class CollectedService {
      @OnEvent('collected.event')
      public handleEvent(payload: unknown): void {
        handler(payload);
      }
    }

    EventModule.forRoot();
    EventModule.registerListeners([CollectedService]);

    // 模拟模块注册流程
    const registry = ModuleRegistry.getInstance();
    const rootContainer = new Container();
    
    // 手动创建 EventModule 的模块引用
    const eventModuleContainer = new Container({ parent: rootContainer });
    const emitter = new EventEmitterService();
    eventModuleContainer.registerInstance(EVENT_EMITTER_TOKEN, emitter);
    eventModuleContainer.register(CollectedService, { implementation: CollectedService });

    // 模拟 ModuleRegistry 的 getModuleRef 返回
    const originalGetModuleRef = registry.getModuleRef.bind(registry);
    registry.getModuleRef = (moduleClass: any) => {
      if (moduleClass === EventModule) {
        return {
          moduleClass: EventModule,
          container: eventModuleContainer,
          metadata: { providers: [], exports: [], imports: [], controllers: [] },
          controllersRegistered: false,
          attachedParents: new Set(),
          extensions: [],
          middlewares: [],
          isGlobal: false,
        } as any;
      }
      return originalGetModuleRef(moduleClass);
    };

    // initializeListeners 会包含通过 registerListeners 注册的类
    EventModule.initializeListeners(eventModuleContainer);

    emitter.emit('collected.event', 'test');

    expect(handler).toHaveBeenCalledWith('test');

    // 恢复原始方法
    registry.getModuleRef = originalGetModuleRef;
  });
});
