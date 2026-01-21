import 'reflect-metadata';
import { Module, MODULE_METADATA_KEY, type ModuleProvider } from '../di/module';
import type { Container } from '../di/container';
import { ModuleRegistry } from '../di/module-registry';

import { EventEmitterService } from './service';
import { getOnEventMetadata, isEventListenerClass } from './decorators';
import {
  EVENT_EMITTER_TOKEN,
  EVENT_OPTIONS_TOKEN,
  type EventModuleOptions,
  type EventEmitter,
} from './types';

/**
 * 事件监听器扫描器
 * 负责扫描和注册带有 @OnEvent() 装饰器的方法
 */
export class EventListenerScanner {
  /**
   * 构造函数
   * @param eventEmitter - 事件发射器服务
   * @param container - DI 容器
   */
  public constructor(
    private readonly eventEmitter: EventEmitter,
    private readonly container: Container,
  ) {}

  /**
   * 扫描并注册监听器类
   * @param listenerClasses - 监听器类数组
   */
  public scanAndRegister(listenerClasses: Function[]): void {
    for (const listenerClass of listenerClasses) {
      this.registerListenerClass(listenerClass);
    }
  }

  /**
   * 注册单个监听器类
   * @param listenerClass - 监听器类
   */
  public registerListenerClass(listenerClass: Function): void {
    if (!isEventListenerClass(listenerClass)) {
      return;
    }

    const metadata = getOnEventMetadata(listenerClass);
    if (!metadata || metadata.length === 0) {
      return;
    }

    // 从容器获取监听器实例
    const instance = this.container.resolve<Record<string, Function>>(
      listenerClass as any,
    );

    if (!instance) {
      console.warn(
        `[EventModule] Failed to resolve listener class: ${listenerClass.name}. ` +
          'Make sure it is registered as a provider.',
      );
      return;
    }

    // 注册所有监听器方法
    for (const listenerMetadata of metadata) {
      const method = instance[listenerMetadata.methodName];
      if (typeof method !== 'function') {
        console.warn(
          `[EventModule] Method "${listenerMetadata.methodName}" not found on ${listenerClass.name}`,
        );
        continue;
      }

      // 绑定方法到实例
      const boundMethod = method.bind(instance);

      // 注册到事件发射器
      this.eventEmitter.on(listenerMetadata.event, boundMethod, {
        async: listenerMetadata.async,
        priority: listenerMetadata.priority,
      });
    }
  }
}

/**
 * 事件监听器扫描器 Token
 */
export const EVENT_LISTENER_SCANNER_TOKEN = Symbol(
  '@dangao/bun-server:events:scanner',
);

@Module({
  providers: [],
})
export class EventModule {
  /**
   * 已注册的监听器类（用于模块初始化后扫描）
   */
  private static listenerClasses: Function[] = [];

  /**
   * 创建事件模块
   * @param options - 模块配置
   *
   * @example
   * ```typescript
   * @Module({
   *   imports: [
   *     EventModule.forRoot({
   *       wildcard: true,
   *       maxListeners: 20,
   *     }),
   *   ],
   *   providers: [NotificationService, AnalyticsService],
   * })
   * class AppModule {}
   * ```
   */
  public static forRoot(options: EventModuleOptions = {}): typeof EventModule {
    const providers: ModuleProvider[] = [];

    // 创建事件发射器服务
    const eventEmitter = new EventEmitterService(options);

    // 注册选项
    providers.push({
      provide: EVENT_OPTIONS_TOKEN,
      useValue: options,
    });

    // 注册事件发射器服务
    providers.push({
      provide: EVENT_EMITTER_TOKEN,
      useValue: eventEmitter,
    });

    // 更新模块元数据
    const existingMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, EventModule) || {};
    const metadata = {
      ...existingMetadata,
      providers: [...(existingMetadata.providers || []), ...providers],
      exports: [
        ...(existingMetadata.exports || []),
        EVENT_EMITTER_TOKEN,
        EVENT_OPTIONS_TOKEN,
      ],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, EventModule);

    // 清空监听器类列表
    EventModule.listenerClasses = [];

    return EventModule;
  }

  /**
   * 注册监听器类
   * 用于在模块配置后手动注册监听器类
   *
   * @param listenerClasses - 监听器类数组
   *
   * @example
   * ```typescript
   * EventModule.registerListeners([NotificationService, AnalyticsService]);
   * ```
   */
  public static registerListeners(listenerClasses: Function[]): void {
    EventModule.listenerClasses.push(...listenerClasses);
  }

  /**
   * 初始化事件监听器扫描
   * 在应用启动时调用，扫描并注册所有监听器
   *
   * @param listenerContainer - 用于解析监听器服务的 DI 容器（通常是应用模块的容器）
   * @param additionalListeners - 额外的监听器类
   *
   * @example
   * ```typescript
   * // 在 registerModule 之后调用
   * app.registerModule(RootModule);
   *
   * // 方式1：传入监听器所在模块的容器（推荐）
   * const moduleRef = ModuleRegistry.getInstance().getModuleRef(RootModule);
   * EventModule.initializeListeners(moduleRef?.container, [NotificationService]);
   *
   * // 方式2：如果监听器在 EventModule 的 providers 中注册，可以不传容器
   * EventModule.initializeListeners(undefined, [NotificationService]);
   * ```
   */
  public static initializeListeners(
    listenerContainer?: Container,
    additionalListeners: Function[] = [],
  ): void {
    // 从 EventModule 自身的容器获取 EventEmitter
    const registry = ModuleRegistry.getInstance();
    const eventModuleRef = registry.getModuleRef(EventModule);

    let eventEmitter: EventEmitter | undefined;

    if (eventModuleRef) {
      try {
        eventEmitter = eventModuleRef.container.resolve<EventEmitter>(EVENT_EMITTER_TOKEN);
      } catch {
        // 忽略错误
      }
    }

    if (!eventEmitter) {
      console.warn(
        '[EventModule] EventEmitter not found. Make sure EventModule.forRoot() is called and the module is registered.',
      );
      return;
    }

    // 确定用于解析监听器的容器
    // 优先使用传入的容器，否则使用 EventModule 的容器
    const resolveContainer = listenerContainer ?? eventModuleRef?.container;

    if (!resolveContainer) {
      console.warn(
        '[EventModule] No container available to resolve listeners.',
      );
      return;
    }

    const scanner = new EventListenerScanner(eventEmitter, resolveContainer);

    // 扫描所有注册的监听器类
    const allListeners = [
      ...EventModule.listenerClasses,
      ...additionalListeners,
    ];
    scanner.scanAndRegister(allListeners);
  }

  /**
   * 获取事件发射器服务（静态方法）
   * 用于在模块配置后获取事件发射器
   *
   * @param container - DI 容器（可选，如果不提供则从 EventModule 自身的容器获取）
   */
  public static getEventEmitter(container?: Container): EventEmitter | undefined {
    // 优先从 EventModule 自身的容器获取
    const registry = ModuleRegistry.getInstance();
    const moduleRef = registry.getModuleRef(EventModule);

    if (moduleRef) {
      try {
        return moduleRef.container.resolve<EventEmitter>(EVENT_EMITTER_TOKEN);
      } catch {
        // 忽略错误，尝试从传入的容器获取
      }
    }

    // 尝试从传入的容器获取
    if (container) {
      try {
        return container.resolve<EventEmitter>(EVENT_EMITTER_TOKEN);
      } catch {
        // 忽略错误
      }
    }

    return undefined;
  }
}
