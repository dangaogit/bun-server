import type {
  EventEmitter,
  EventListener,
  EventModuleOptions,
  ListenerOptions,
  RegisteredListener,
} from './types';

/**
 * 事件发射器服务实现
 */
export class EventEmitterService implements EventEmitter {
  /**
   * 事件监听器映射
   */
  private listeners: Map<string | symbol, RegisteredListener[]> = new Map();

  /**
   * 模块选项
   */
  private options: EventModuleOptions;

  /**
   * 构造函数
   * @param options - 模块选项
   */
  public constructor(options: EventModuleOptions = {}) {
    this.options = {
      wildcard: false,
      delimiter: '.',
      maxListeners: 10,
      ...options,
    };
  }

  /**
   * 发布事件（同步触发所有监听器，不等待异步监听器完成）
   */
  public emit<T>(event: string | symbol, payload: T): void {
    const eventName = this.resolveEventName(event);
    const matchedListeners = this.getMatchedListeners(eventName);

    if (matchedListeners.length === 0) {
      return;
    }

    // 按优先级排序（高优先级先执行）
    const sortedListeners = this.sortListenersByPriority(matchedListeners);

    for (const { listener, once, async: isAsync } of sortedListeners) {
      try {
        const result = listener(payload);
        // 如果监听器是异步的，不等待完成
        if (isAsync && result instanceof Promise) {
          result.catch((error) => {
            this.handleError(error, eventName, payload);
          });
        }
      } catch (error) {
        this.handleError(error as Error, eventName, payload);
      }

      // 如果是一次性监听器，移除它
      if (once) {
        this.off(eventName, listener);
      }
    }
  }

  /**
   * 异步发布事件（等待所有监听器完成）
   */
  public async emitAsync<T>(event: string | symbol, payload: T): Promise<void> {
    const eventName = this.resolveEventName(event);
    const matchedListeners = this.getMatchedListeners(eventName);

    if (matchedListeners.length === 0) {
      return;
    }

    // 按优先级排序（高优先级先执行）
    const sortedListeners = this.sortListenersByPriority(matchedListeners);

    const promises: Promise<void>[] = [];
    const toRemove: EventListener[] = [];

    for (const { listener, once } of sortedListeners) {
      try {
        const result = listener(payload);
        if (result instanceof Promise) {
          promises.push(
            result.catch((error) => {
              this.handleError(error, eventName, payload);
            }),
          );
        }
      } catch (error) {
        this.handleError(error as Error, eventName, payload);
      }

      if (once) {
        toRemove.push(listener);
      }
    }

    // 等待所有异步监听器完成
    if (promises.length > 0) {
      await Promise.all(promises);
    }

    // 移除一次性监听器
    for (const listener of toRemove) {
      this.off(eventName, listener);
    }
  }

  /**
   * 订阅事件
   */
  public on<T>(
    event: string | symbol,
    listener: EventListener<T>,
    options: ListenerOptions = {},
  ): () => void {
    const eventName = this.resolveEventName(event);
    return this.addListener(eventName, listener, false, options);
  }

  /**
   * 一次性订阅
   */
  public once<T>(
    event: string | symbol,
    listener: EventListener<T>,
    options: ListenerOptions = {},
  ): () => void {
    const eventName = this.resolveEventName(event);
    return this.addListener(eventName, listener, true, options);
  }

  /**
   * 取消订阅
   */
  public off<T>(event: string | symbol, listener: EventListener<T>): void {
    const eventName = this.resolveEventName(event);
    const eventListeners = this.listeners.get(eventName);

    if (!eventListeners) {
      return;
    }

    const index = eventListeners.findIndex((l) => l.listener === listener);
    if (index !== -1) {
      eventListeners.splice(index, 1);
    }

    // 如果没有监听器了，移除事件
    if (eventListeners.length === 0) {
      this.listeners.delete(eventName);
    }
  }

  /**
   * 移除所有监听器
   */
  public removeAllListeners(event?: string | symbol): void {
    if (event !== undefined) {
      const eventName = this.resolveEventName(event);
      this.listeners.delete(eventName);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * 获取指定事件的监听器数量
   */
  public listenerCount(event: string | symbol): number {
    const eventName = this.resolveEventName(event);
    const matchedListeners = this.getMatchedListeners(eventName);
    return matchedListeners.length;
  }

  /**
   * 获取所有已注册的事件名称
   */
  public eventNames(): (string | symbol)[] {
    return Array.from(this.listeners.keys());
  }

  /**
   * 添加监听器
   */
  private addListener<T>(
    event: string | symbol,
    listener: EventListener<T>,
    once: boolean,
    options: ListenerOptions,
  ): () => void {
    let eventListeners = this.listeners.get(event);

    if (!eventListeners) {
      eventListeners = [];
      this.listeners.set(event, eventListeners);
    }

    // 检查监听器数量限制
    if (
      this.options.maxListeners &&
      eventListeners.length >= this.options.maxListeners
    ) {
      console.warn(
        `[EventEmitter] Max listeners (${this.options.maxListeners}) exceeded for event: ${String(event)}. ` +
          'This may indicate a memory leak.',
      );
    }

    const registeredListener: RegisteredListener<T> = {
      listener,
      once,
      priority: options.priority ?? 0,
      async: options.async ?? false,
    };

    eventListeners.push(registeredListener as RegisteredListener);

    // 返回取消订阅函数
    return () => {
      this.off(event, listener);
    };
  }

  /**
   * 解析事件名称（添加全局前缀）
   */
  private resolveEventName(event: string | symbol): string | symbol {
    if (typeof event === 'symbol') {
      return event;
    }

    if (this.options.globalPrefix) {
      return `${this.options.globalPrefix}${this.options.delimiter}${event}`;
    }

    return event;
  }

  /**
   * 获取匹配的监听器（支持通配符）
   */
  private getMatchedListeners(event: string | symbol): RegisteredListener[] {
    const result: RegisteredListener[] = [];

    // 精确匹配
    const exactListeners = this.listeners.get(event);
    if (exactListeners) {
      result.push(...exactListeners);
    }

    // 通配符匹配
    if (this.options.wildcard && typeof event === 'string') {
      const delimiter = this.options.delimiter ?? '.';
      const eventParts = event.split(delimiter);

      for (const [key, listeners] of this.listeners.entries()) {
        if (typeof key !== 'string' || key === event) {
          continue;
        }

        if (this.matchWildcard(eventParts, key.split(delimiter))) {
          result.push(...listeners);
        }
      }
    }

    return result;
  }

  /**
   * 匹配通配符模式
   */
  private matchWildcard(eventParts: string[], patternParts: string[]): boolean {
    let eventIndex = 0;
    let patternIndex = 0;

    while (patternIndex < patternParts.length) {
      const pattern = patternParts[patternIndex];

      if (pattern === '**') {
        // ** 匹配任意数量的部分
        if (patternIndex === patternParts.length - 1) {
          return true; // ** 在末尾，匹配所有剩余部分
        }
        // 尝试匹配后续部分
        for (let i = eventIndex; i <= eventParts.length; i++) {
          if (
            this.matchWildcard(
              eventParts.slice(i),
              patternParts.slice(patternIndex + 1),
            )
          ) {
            return true;
          }
        }
        return false;
      } else if (pattern === '*') {
        // * 匹配单个部分
        if (eventIndex >= eventParts.length) {
          return false;
        }
        eventIndex++;
        patternIndex++;
      } else {
        // 精确匹配
        if (eventIndex >= eventParts.length || eventParts[eventIndex] !== pattern) {
          return false;
        }
        eventIndex++;
        patternIndex++;
      }
    }

    return eventIndex === eventParts.length;
  }

  /**
   * 按优先级排序监听器
   */
  private sortListenersByPriority(
    listeners: RegisteredListener[],
  ): RegisteredListener[] {
    return [...listeners].sort((a, b) => b.priority - a.priority);
  }

  /**
   * 处理错误
   */
  private handleError(
    error: Error,
    event: string | symbol,
    payload: unknown,
  ): void {
    if (this.options.onError) {
      this.options.onError(error, event, payload);
    } else {
      console.error(
        `[EventEmitter] Error in listener for event "${String(event)}":`,
        error,
      );
    }
  }
}
