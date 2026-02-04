/**
 * 事件监听器接口
 * @template T - 事件负载类型
 */
export interface EventListener<T = unknown> {
  (payload: T): void | Promise<void>;
}

/**
 * 事件元数据
 */
export interface EventMetadata {
  /**
   * 事件名称或标识符
   */
  event: string | symbol;

  /**
   * 是否异步处理
   * @default false
   */
  async?: boolean;

  /**
   * 监听器优先级（数值越大优先级越高）
   * @default 0
   */
  priority?: number;
}

/**
 * 已注册的监听器信息
 */
export interface RegisteredListener<T = unknown> {
  /**
   * 监听器函数
   */
  listener: EventListener<T>;

  /**
   * 是否一次性监听
   */
  once: boolean;

  /**
   * 优先级
   */
  priority: number;

  /**
   * 是否异步处理
   */
  async: boolean;
}

/**
 * EventEmitter 服务接口
 */
export interface EventEmitter {
  /**
   * 发布事件（同步触发所有监听器，不等待异步监听器完成）
   * @param event - 事件名称或标识符
   * @param payload - 事件负载
   */
  emit<T>(event: string | symbol, payload: T): void;

  /**
   * 异步发布事件（等待所有监听器完成）
   * @param event - 事件名称或标识符
   * @param payload - 事件负载
   */
  emitAsync<T>(event: string | symbol, payload: T): Promise<void>;

  /**
   * 订阅事件
   * @param event - 事件名称或标识符
   * @param listener - 监听器函数
   * @param options - 监听选项
   * @returns 取消订阅函数
   */
  on<T>(
    event: string | symbol,
    listener: EventListener<T>,
    options?: ListenerOptions,
  ): () => void;

  /**
   * 一次性订阅
   * @param event - 事件名称或标识符
   * @param listener - 监听器函数
   * @param options - 监听选项
   * @returns 取消订阅函数
   */
  once<T>(
    event: string | symbol,
    listener: EventListener<T>,
    options?: ListenerOptions,
  ): () => void;

  /**
   * 取消订阅
   * @param event - 事件名称或标识符
   * @param listener - 监听器函数
   */
  off<T>(event: string | symbol, listener: EventListener<T>): void;

  /**
   * 移除指定事件的所有监听器，或移除所有事件的所有监听器
   * @param event - 事件名称或标识符（可选）
   */
  removeAllListeners(event?: string | symbol): void;

  /**
   * 获取指定事件的监听器数量
   * @param event - 事件名称或标识符
   */
  listenerCount(event: string | symbol): number;

  /**
   * 获取所有已注册的事件名称
   */
  eventNames(): (string | symbol)[];
}

/**
 * 监听器选项
 */
export interface ListenerOptions {
  /**
   * 优先级（数值越大优先级越高）
   * @default 0
   */
  priority?: number;

  /**
   * 是否异步处理
   * @default false
   */
  async?: boolean;
}

/**
 * EventModule 配置选项
 */
export interface EventModuleOptions {
  /**
   * 是否启用通配符事件（如 'user.*'）
   * @default false
   */
  wildcard?: boolean;

  /**
   * 通配符分隔符
   * @default '.'
   */
  delimiter?: string;

  /**
   * 全局事件前缀
   */
  globalPrefix?: string;

  /**
   * 最大监听器数量（防止内存泄漏）
   * @default 10
   */
  maxListeners?: number;

  /**
   * 错误处理函数
   * @param error - 错误对象
   * @param event - 事件名称
   * @param payload - 事件负载
   */
  onError?: (error: Error, event: string | symbol, payload: unknown) => void;

  /**
   * 是否自动扫描和注册事件监听器
   * 当设置为 true 时，框架会在应用启动时自动扫描所有模块中使用 @OnEvent 装饰器的类
   * @default true
   */
  autoScan?: boolean;

  /**
   * 需要排除的监听器类（不自动注册）
   * 用于在自动扫描时排除某些类
   */
  excludeListeners?: Function[];

  /**
   * 额外的监听器类（强制注册）
   * 即使 autoScan 为 false，这些类也会被注册
   */
  includeListeners?: Function[];
}

/**
 * 装饰器方法元数据
 */
export interface OnEventMethodMetadata {
  /**
   * 方法名
   */
  methodName: string;

  /**
   * 事件名称或标识符
   */
  event: string | symbol;

  /**
   * 是否异步处理
   */
  async: boolean;

  /**
   * 优先级
   */
  priority: number;
}

/**
 * 事件服务 Token
 */
export const EVENT_EMITTER_TOKEN = Symbol('@dangao/bun-server:events:emitter');

/**
 * 事件模块选项 Token
 */
export const EVENT_OPTIONS_TOKEN = Symbol('@dangao/bun-server:events:options');

/**
 * OnEvent 装饰器元数据 Key
 */
export const ON_EVENT_METADATA_KEY = Symbol('@dangao/bun-server:events:on-event');

/**
 * 事件监听器类元数据 Key
 */
export const EVENT_LISTENER_CLASS_METADATA_KEY = Symbol(
  '@dangao/bun-server:events:listener-class',
);
