import type { Interceptor } from './types';
import type { Container } from '../di/container';
import type { Context } from '../core/context';
import 'reflect-metadata';

/**
 * 拦截器基类
 * 提供便捷的前置处理、后置处理和错误处理方法
 */
export abstract class BaseInterceptor implements Interceptor {
  /**
   * 执行拦截器逻辑
   * 子类必须实现此方法
   */
  public abstract execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T>;

  /**
   * 前置处理（可选）
   * 在方法执行前调用，子类可以覆盖此方法
   * @param target - 目标对象
   * @param propertyKey - 方法名
   * @param args - 方法参数
   * @param container - DI 容器
   * @param context - 请求上下文（可选）
   */
  protected async before(
    target: unknown,
    propertyKey: string | symbol,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<void> {
    // 默认空实现，子类可覆盖
  }

  /**
   * 后置处理（可选）
   * 在方法执行后调用，子类可以覆盖此方法
   * @param target - 目标对象
   * @param propertyKey - 方法名
   * @param result - 方法执行结果
   * @param container - DI 容器
   * @param context - 请求上下文（可选）
   * @returns 处理后的结果（默认返回原结果）
   */
  protected async after<T>(
    target: unknown,
    propertyKey: string | symbol,
    result: T,
    container: Container,
    context?: Context,
  ): Promise<T> {
    // 默认返回原结果，子类可覆盖
    return result;
  }

  /**
   * 错误处理（可选）
   * 在方法执行出错时调用，子类可以覆盖此方法
   * @param target - 目标对象
   * @param propertyKey - 方法名
   * @param error - 错误对象
   * @param container - DI 容器
   * @param context - 请求上下文（可选）
   * @returns 永远不会返回（总是抛出错误）
   * @throws 重新抛出错误或抛出新的错误
   */
  protected async onError(
    target: unknown,
    propertyKey: string | symbol,
    error: unknown,
    container: Container,
    context?: Context,
  ): Promise<never> {
    // 默认重新抛出错误，子类可覆盖
    throw error;
  }

  /**
   * 获取元数据
   * 从目标对象的方法上获取指定元数据键的元数据
   * 支持从实例或原型上获取元数据（元数据通常存储在原型上）
   * @param target - 目标对象（可能是实例或原型）
   * @param propertyKey - 方法名
   * @param metadataKey - 元数据键
   * @returns 元数据值，如果不存在则返回 undefined
   */
  protected getMetadata<T = unknown>(
    target: unknown,
    propertyKey: string | symbol,
    metadataKey: symbol,
  ): T | undefined {
    if (typeof target !== 'object' || target === null) {
      return undefined;
    }

    // 首先尝试直接从 target 获取（如果 target 是原型）
    let metadata = Reflect.getMetadata(metadataKey, target, propertyKey) as T | undefined;
    if (metadata !== undefined) {
      return metadata;
    }

    // 如果 target 是实例，尝试从原型获取
    // 装饰器元数据通常存储在原型上，而不是实例上
    const prototype = Object.getPrototypeOf(target);
    if (prototype && prototype !== Object.prototype) {
      metadata = Reflect.getMetadata(metadataKey, prototype, propertyKey) as T | undefined;
      if (metadata !== undefined) {
        return metadata;
      }
    }

    // 如果仍然找不到，尝试从构造函数原型获取
    // 这处理了 target 是实例但原型链查找失败的情况
    const constructor = (target as any).constructor;
    if (constructor && typeof constructor === 'function') {
      // 如果 target 本身不是构造函数原型，尝试从构造函数原型获取
      if (target !== constructor.prototype) {
        metadata = Reflect.getMetadata(metadataKey, constructor.prototype, propertyKey) as T | undefined;
        if (metadata !== undefined) {
          return metadata;
        }
      }
    }

    return undefined;
  }

  /**
   * 从容器解析服务
   * @param container - DI 容器
   * @param token - 服务标识符
   * @returns 服务实例
   */
  protected resolveService<T>(
    container: Container,
    token: (new (...args: unknown[]) => T) | string | symbol,
  ): T {
    return container.resolve<T>(token);
  }

  /**
   * 从上下文获取值
   * @param context - 请求上下文
   * @param key - 键名
   * @returns 值，如果不存在则返回 undefined
   */
  protected getContextValue<T = unknown>(context: Context | undefined, key: string): T | undefined {
    if (!context) {
      return undefined;
    }
    // Context 没有直接的存储机制，可以通过 headers 或其他方式获取
    // 这里提供一个基础实现，子类可以根据需要扩展
    return undefined;
  }

  /**
   * 从上下文获取请求头
   * @param context - 请求上下文
   * @param headerName - 请求头名称
   * @returns 请求头值，如果不存在则返回 null
   */
  protected getHeader(context: Context | undefined, headerName: string): string | null {
    if (!context) {
      return null;
    }
    return context.getHeader(headerName);
  }

  /**
   * 从上下文获取查询参数
   * @param context - 请求上下文
   * @param paramName - 参数名称
   * @returns 参数值，如果不存在则返回 null
   */
  protected getQuery(context: Context | undefined, paramName: string): string | null {
    if (!context) {
      return null;
    }
    return context.getQuery(paramName);
  }

  /**
   * 从上下文获取路径参数
   * @param context - 请求上下文
   * @param paramName - 参数名称
   * @returns 参数值，如果不存在则返回 undefined
   */
  protected getParam(context: Context | undefined, paramName: string): string | undefined {
    if (!context) {
      return undefined;
    }
    return context.getParam(paramName);
  }
}

