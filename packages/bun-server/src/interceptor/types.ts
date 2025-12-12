import type { Container } from '../di/container';
import type { Context } from '../core/context';

/**
 * 拦截器接口
 * 定义拦截器的核心执行方法
 */
export interface Interceptor {
  /**
   * 执行拦截器逻辑
   * @param target - 目标对象（控制器实例的原型）
   * @param propertyKey - 方法名
   * @param originalMethod - 原始方法
   * @param args - 方法参数
   * @param container - DI 容器
   * @param context - 请求上下文（可选）
   * @returns 方法执行结果
   */
  execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T>;
}

/**
 * 拦截器元数据
 * 用于存储拦截器的注册信息
 */
export interface InterceptorMetadata {
  /**
   * 元数据键（用于匹配装饰器）
   */
  metadataKey: symbol;
  /**
   * 拦截器实例
   */
  interceptor: Interceptor;
  /**
   * 优先级（数字越小优先级越高，默认 100）
   */
  priority: number;
}

/**
 * 拦截器注册表 Token
 */
export const INTERCEPTOR_REGISTRY_TOKEN = Symbol('@dangao/bun-server:interceptor-registry');

