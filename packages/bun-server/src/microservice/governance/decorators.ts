import 'reflect-metadata';
import type { CircuitBreakerOptions } from './types';
import type { Constructor } from '../../core/types';

/**
 * 熔断器装饰器元数据键
 */
const CIRCUIT_BREAKER_METADATA_KEY = Symbol('circuit-breaker:metadata');

/**
 * 熔断器元数据
 */
export interface CircuitBreakerMetadata {
  /**
   * 熔断器选项
   */
  options?: CircuitBreakerOptions;

  /**
   * 降级处理函数名（可选）
   */
  fallbackMethod?: string;
}

/**
 * CircuitBreaker 装饰器
 * 用于在方法上自动应用熔断保护
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   @CircuitBreaker({
 *     failureThreshold: 5,
 *     resetTimeout: 60000,
 *   })
 *   public async callExternalService() {
 *     // 自动应用熔断保护
 *   }
 *
 *   @CircuitBreaker({
 *     failureThreshold: 5,
 *   }, 'fallbackMethod')
 *   public async callWithFallback() {
 *     // 自动应用熔断保护，失败时调用 fallbackMethod
 *   }
 *
 *   private async fallbackMethod() {
 *     return { message: 'Fallback response' };
 *   }
 * }
 * ```
 */
export function CircuitBreaker(
  options?: CircuitBreakerOptions,
  fallbackMethod?: string,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const metadata: CircuitBreakerMetadata = {
      options,
      fallbackMethod,
    };

    // 保存元数据
    const existingMetadata: Map<string | symbol, CircuitBreakerMetadata> =
      Reflect.getMetadata(CIRCUIT_BREAKER_METADATA_KEY, target.constructor) ||
      new Map();
    existingMetadata.set(propertyKey, metadata);
    Reflect.defineMetadata(
      CIRCUIT_BREAKER_METADATA_KEY,
      existingMetadata,
      target.constructor,
    );

    // 保存原始方法
    const originalMethod = descriptor.value;

    // 包装方法，应用熔断保护
    descriptor.value = async function (...args: any[]) {
      // 动态导入 CircuitBreaker（避免循环依赖）
      const { CircuitBreaker: CircuitBreakerImpl } = await import(
        './circuit-breaker'
      );

      const circuitBreaker = new CircuitBreakerImpl(metadata.options);

      const fallback = metadata.fallbackMethod
        ? (this as any)[metadata.fallbackMethod]?.bind(this)
        : undefined;

      return circuitBreaker.execute(
        () => originalMethod.apply(this, args),
        fallback,
      );
    };
  };
}

/**
 * 获取方法的熔断器元数据
 */
export function getCircuitBreakerMetadata(
  target: Constructor<unknown>,
): Map<string | symbol, CircuitBreakerMetadata> {
  return (
    Reflect.getMetadata(CIRCUIT_BREAKER_METADATA_KEY, target) || new Map()
  );
}

