import 'reflect-metadata';
import type { Container } from '../di/container';
import type { InstancePostProcessor } from '../di/types';
import type { Constructor } from '../core/types';
import {
  getCacheableMetadata,
  getCacheEvictMetadata,
  getCachePutMetadata,
} from './decorators';
import {
  CacheableInterceptor,
  CacheEvictInterceptor,
  CachePutInterceptor,
} from './interceptors';

/**
 * 缓存服务代理工厂
 * 为服务实例创建代理，拦截带有缓存装饰器的方法
 */
export class CacheServiceProxy {
  private static cacheableInterceptor = new CacheableInterceptor();
  private static cacheEvictInterceptor = new CacheEvictInterceptor();
  private static cachePutInterceptor = new CachePutInterceptor();

  /**
   * 为服务实例创建缓存代理
   * @param instance - 原始服务实例
   * @param container - DI 容器
   * @returns 代理实例
   */
  public static createProxy<T extends object>(
    instance: T,
    container: Container,
  ): T {
    const prototype = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(prototype).filter(
      (name) => name !== 'constructor' && typeof prototype[name] === 'function',
    );

    // 检查是否有任何需要缓存处理的方法
    // 从原型获取方法（元数据存储在原型的方法上）
    let hasAnyMetadata = false;
    for (const methodName of methodNames) {
      const prototypeMethod = prototype[methodName];
      const cacheable = getCacheableMetadata(prototypeMethod);
      const cacheEvict = getCacheEvictMetadata(prototypeMethod);
      const cachePut = getCachePutMetadata(prototypeMethod);

      if (cacheable || cacheEvict || cachePut) {
        hasAnyMetadata = true;
        break;
      }
    }

    // 如果没有缓存装饰器，直接返回原实例
    if (!hasAnyMetadata) {
      return instance;
    }

    // 创建代理
    return new Proxy(instance, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);

        // 只处理函数
        if (typeof value !== 'function' || typeof prop === 'symbol') {
          return value;
        }

        const methodName = prop as string;

        // 从原型获取方法以检查元数据（元数据存储在原型的方法上）
        const prototypeMethod = prototype[methodName];
        if (!prototypeMethod) {
          return value;
        }

        // 检查缓存装饰器（从原型方法获取元数据）
        const cacheableMetadata = getCacheableMetadata(prototypeMethod);
        const cacheEvictMetadata = getCacheEvictMetadata(prototypeMethod);
        const cachePutMetadata = getCachePutMetadata(prototypeMethod);

        // 如果没有缓存装饰器，返回原方法
        if (!cacheableMetadata && !cacheEvictMetadata && !cachePutMetadata) {
          return value;
        }

        // 返回包装后的方法
        // 使用原型方法以确保拦截器能获取到正确的元数据
        const originalMethod = prototypeMethod as (...args: unknown[]) => unknown;

        return async function (this: T, ...args: unknown[]): Promise<unknown> {
          // 按优先级执行拦截器：CacheEvict (beforeInvocation) -> Cacheable/CachePut -> CacheEvict (afterInvocation)

          // 如果有 @CacheEvict 且配置了 beforeInvocation
          if (cacheEvictMetadata?.beforeInvocation) {
            await CacheServiceProxy.cacheEvictInterceptor.execute(
              target,
              methodName,
              originalMethod.bind(target),
              args,
              container,
            );
            // beforeInvocation 只清除缓存，继续执行
          }

          let result: unknown;

          // 如果有 @Cacheable，使用缓存逻辑
          if (cacheableMetadata) {
            result = await CacheServiceProxy.cacheableInterceptor.execute(
              target,
              methodName,
              originalMethod.bind(target),
              args,
              container,
            );
          } else if (cachePutMetadata) {
            // 如果有 @CachePut，执行并更新缓存
            result = await CacheServiceProxy.cachePutInterceptor.execute(
              target,
              methodName,
              originalMethod.bind(target),
              args,
              container,
            );
          } else {
            // 只有 @CacheEvict，正常执行方法
            result = await originalMethod.apply(target, args);
          }

          // 如果有 @CacheEvict 且未配置 beforeInvocation（默认行为）
          if (cacheEvictMetadata && !cacheEvictMetadata.beforeInvocation) {
            // 执行缓存清除逻辑（方法已执行，只需清除缓存）
            await CacheServiceProxy.cacheEvictInterceptor.execute(
              target,
              methodName,
              async () => result, // 返回已有结果，不再执行方法
              args,
              container,
            );
          }

          return result;
        };
      },
    });
  }
}

/**
 * 元数据键：标记服务需要缓存代理
 */
export const CACHE_PROXY_ENABLED_KEY = Symbol('@dangao/bun-server:cache:proxy-enabled');

/**
 * 启用服务缓存代理的装饰器
 * 用于标记服务类需要缓存代理支持
 *
 * @example
 * ```ts
 * @Injectable()
 * @EnableCacheProxy()
 * class UserService {
 *   @Cacheable({ key: 'user:{0}', ttl: 60000 })
 *   async findById(id: string) {
 *     return await this.db.findUser(id);
 *   }
 * }
 * ```
 */
export function EnableCacheProxy(): ClassDecorator {
  return function (target: Function): void {
    Reflect.defineMetadata(CACHE_PROXY_ENABLED_KEY, true, target);
  };
}

/**
 * 检查类是否启用了缓存代理
 * @param target - 目标类
 * @returns 是否启用
 */
export function isCacheProxyEnabled(target: Function): boolean {
  return Reflect.getMetadata(CACHE_PROXY_ENABLED_KEY, target) === true;
}

/**
 * 缓存实例后处理器
 * 自动为带有 @EnableCacheProxy() 装饰器的服务创建缓存代理
 */
export class CachePostProcessor implements InstancePostProcessor {
  /**
   * 优先级（较低以确保在其他处理器之后运行）
   */
  public priority = 50;

  /**
   * 处理新创建的实例
   */
  public postProcess<T>(
    instance: T,
    constructor: Constructor<T>,
    container: unknown,
  ): T {
    // 检查是否启用了缓存代理
    const proxyEnabled = isCacheProxyEnabled(constructor);
    if (!proxyEnabled) {
      return instance;
    }

    // 创建缓存代理
    const proxied = CacheServiceProxy.createProxy(
      instance as object,
      container as Container,
    ) as T;

    return proxied;
  }
}
