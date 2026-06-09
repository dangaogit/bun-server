import type { Interceptor } from './types';
import type { Container } from '../di/container';
import type { Context } from '../core/context';

/**
 * 拦截器链执行器
 * 负责按优先级顺序执行多个拦截器
 */
export class InterceptorChain {
  /**
   * 执行拦截器链
   * @param interceptors - 拦截器列表（已按优先级排序）
   * @param target - 目标对象
   * @param propertyKey - 方法名
   * @param originalMethod - 原始方法
   * @param args - 方法参数
   * @param container - DI 容器
   * @param context - 请求上下文（可选）
   * @returns 方法执行结果
   */
  public static async execute<T>(
    interceptors: Interceptor[],
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: any[]) => T | Promise<T>,
    args: any[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    if (interceptors.length === 0) {
      // 没有拦截器，直接执行原方法
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 构建执行链
    let index = 0;
    let currentArgs = args; // Track arguments that might be modified by interceptors
    
    const next = async (modifiedArgs?: any[]): Promise<T> => {
      // 如果拦截器传递了新参数，使用新参数；否则使用当前参数
      if (modifiedArgs && modifiedArgs.length > 0) {
        currentArgs = modifiedArgs;
      }
      
      if (index >= interceptors.length) {
        // 所有拦截器执行完毕，执行原方法（使用可能被修改的参数）
        return await Promise.resolve(originalMethod.apply(target, currentArgs));
      }

      const interceptor = interceptors[index++];
      
      // 执行当前拦截器，传递 next 作为下一个执行函数
      // 注意：拦截器接口要求 originalMethod 的类型是 (...args: any[]) => T | Promise<T>
      // 这允许原始方法可以是同步（返回 T）或异步（返回 Promise<T>）
      // 虽然 next 函数是异步的（总是返回 Promise<T>），但我们保持类型签名为 T | Promise<T>
      // 以符合拦截器接口的要求。拦截器应该使用 Promise.resolve() 来统一处理同步和异步返回值
      const wrappedNext = (...nextArgs: any[]): T | Promise<T> => {
        // 如果拦截器传递了新参数，传递给 next；否则传递 undefined（使用当前参数）
        // next 是异步函数，总是返回 Promise<T>，但类型签名允许 T | Promise<T>
        const result = next(nextArgs.length > 0 ? nextArgs : undefined);
        // 类型断言：虽然 result 总是 Promise<T>，但类型系统允许我们将其视为 T | Promise<T>
        // 因为 Promise<T> 在运行时可以表示同步值（通过 Promise.resolve(syncValue)）
        return result as T | Promise<T>;
      };
      
      return await interceptor.execute(
        target,
        propertyKey,
        wrappedNext,
        currentArgs, // Pass current args to the interceptor
        container,
        context,
      ) as T;
    };

    return await next();
  }
}
