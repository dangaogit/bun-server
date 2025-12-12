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
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    if (interceptors.length === 0) {
      // 没有拦截器，直接执行原方法
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 构建执行链
    let index = 0;
    
    const next = async (): Promise<T> => {
      if (index >= interceptors.length) {
        // 所有拦截器执行完毕，执行原方法
        return await Promise.resolve(originalMethod.apply(target, args));
      }

      const interceptor = interceptors[index++];
      
      // 执行当前拦截器，传递 next 作为下一个执行函数
      return await interceptor.execute(
        target,
        propertyKey,
        async (...nextArgs: unknown[]) => {
          // 如果拦截器传递了新参数，使用新参数；否则使用原参数
          const finalArgs = nextArgs.length > 0 ? nextArgs : args;
          return await next();
        },
        args,
        container,
        context,
      );
    };

    return await next();
  }
}

