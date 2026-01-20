import 'reflect-metadata';
import { BaseInterceptor } from '../interceptor/base-interceptor';
import type { Container } from '../di/container';
import type { Context } from '../core/context';
import type { CacheService } from './service';
import { CACHE_SERVICE_TOKEN } from './types';
import {
  getCacheableMetadata,
  getCacheEvictMetadata,
  getCachePutMetadata,
  type CacheableMetadata,
  type CacheEvictMetadata,
  type CachePutMetadata,
} from './decorators';

/**
 * 缓存装饰器元数据键（用于拦截器注册）
 */
export const CACHEABLE_INTERCEPTOR_KEY = Symbol('@dangao/bun-server:cache:cacheable');
export const CACHE_EVICT_INTERCEPTOR_KEY = Symbol('@dangao/bun-server:cache:cache-evict');
export const CACHE_PUT_INTERCEPTOR_KEY = Symbol('@dangao/bun-server:cache:cache-put');

/**
 * 解析缓存键中的参数占位符
 * 支持 SpEL 风格的表达式，如 'user:{id}' 或 'user:{0}'
 * @param keyTemplate - 键模板
 * @param args - 方法参数
 * @param paramNames - 参数名称（如果可用）
 * @returns 解析后的缓存键
 */
function resolveKeyTemplate(
  keyTemplate: string,
  args: unknown[],
  paramNames?: string[],
): string {
  let result = keyTemplate;

  // 替换数字索引占位符，如 {0}, {1}
  result = result.replace(/\{(\d+)\}/g, (_, index) => {
    const i = parseInt(index, 10);
    if (i < args.length) {
      return String(args[i]);
    }
    return `{${index}}`;
  });

  // 替换命名参数占位符，如 {id}, {name}
  if (paramNames) {
    for (let i = 0; i < paramNames.length; i++) {
      const name = paramNames[i];
      const regex = new RegExp(`\\{${name}\\}`, 'g');
      result = result.replace(regex, String(args[i]));
    }
  }

  return result;
}

/**
 * 生成默认缓存键
 * @param target - 目标对象
 * @param propertyKey - 方法名
 * @param args - 方法参数
 * @param keyPrefix - 键前缀
 * @returns 缓存键
 */
function generateDefaultCacheKey(
  target: unknown,
  propertyKey: string | symbol,
  args: unknown[],
  keyPrefix?: string,
): string {
  const className = typeof target === 'object' && target !== null
    ? (target as { constructor?: { name?: string } }).constructor?.name || 'Unknown'
    : 'Unknown';
  const methodName = String(propertyKey);
  const argsKey = args.length > 0 ? ':' + JSON.stringify(args) : '';
  const prefix = keyPrefix ? `${keyPrefix}:` : '';

  return `${prefix}${className}:${methodName}${argsKey}`;
}

/**
 * @Cacheable 拦截器
 * 实现方法结果缓存功能
 */
export class CacheableInterceptor extends BaseInterceptor {
  /**
   * 执行拦截器逻辑
   */
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    // 从原型方法获取元数据（元数据存储在原型上，而不是绑定后的函数上）
    // 当通过代理调用时，originalMethod 可能是 .bind() 后的函数，没有元数据
    // 所以我们需要从 target 的原型上获取原始方法来读取元数据
    let metadata = getCacheableMetadata(originalMethod);

    if (!metadata && target && typeof target === 'object') {
      const prototype = Object.getPrototypeOf(target);
      if (prototype && typeof propertyKey === 'string') {
        const protoMethod = prototype[propertyKey];
        if (protoMethod) {
          metadata = getCacheableMetadata(protoMethod);
        }
      }
    }

    if (!metadata) {
      // 没有缓存元数据，直接执行原方法
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 获取缓存服务
    let cacheService: CacheService;
    try {
      cacheService = container.resolve<CacheService>(CACHE_SERVICE_TOKEN);
    } catch {
      // 缓存服务未注册，直接执行原方法
      console.warn('[CacheableInterceptor] CacheService not registered, skipping cache');
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 生成缓存键
    const cacheKey = metadata.key
      ? resolveKeyTemplate(metadata.key, args)
      : generateDefaultCacheKey(target, propertyKey, args, metadata.keyPrefix);

    // 检查条件表达式（如果有）
    if (metadata.condition) {
      // 简单的条件评估：目前只支持 'true'/'false' 字符串
      // 未来可以扩展为完整的表达式求值
      if (metadata.condition === 'false') {
        return await Promise.resolve(originalMethod.apply(target, args));
      }
    }

    // 使用 getOrSet 实现缓存逻辑
    const result = await cacheService.getOrSet<T>(
      cacheKey,
      async () => {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
      metadata.ttl,
    );

    return result;
  }
}

/**
 * @CacheEvict 拦截器
 * 实现缓存清除功能
 */
export class CacheEvictInterceptor extends BaseInterceptor {
  /**
   * 执行拦截器逻辑
   */
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    // 从原型方法获取元数据
    let metadata = getCacheEvictMetadata(originalMethod);

    if (!metadata && target && typeof target === 'object') {
      const prototype = Object.getPrototypeOf(target);
      if (prototype && typeof propertyKey === 'string') {
        const protoMethod = prototype[propertyKey];
        if (protoMethod) {
          metadata = getCacheEvictMetadata(protoMethod);
        }
      }
    }

    if (!metadata) {
      // 没有缓存清除元数据，直接执行原方法
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 获取缓存服务
    let cacheService: CacheService;
    try {
      cacheService = container.resolve<CacheService>(CACHE_SERVICE_TOKEN);
    } catch {
      // 缓存服务未注册，直接执行原方法
      console.warn('[CacheEvictInterceptor] CacheService not registered, skipping cache eviction');
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 生成缓存键
    const cacheKey = metadata.key
      ? resolveKeyTemplate(metadata.key, args)
      : generateDefaultCacheKey(target, propertyKey, args, metadata.keyPrefix);

    // 如果配置了在方法执行前清除缓存
    if (metadata.beforeInvocation) {
      if (metadata.allEntries) {
        await cacheService.clear();
      } else {
        await cacheService.delete(cacheKey);
      }
    }

    // 执行原方法
    const result = await Promise.resolve(originalMethod.apply(target, args));

    // 如果配置了在方法执行后清除缓存（默认行为）
    if (!metadata.beforeInvocation) {
      if (metadata.allEntries) {
        await cacheService.clear();
      } else {
        await cacheService.delete(cacheKey);
      }
    }

    return result;
  }
}

/**
 * @CachePut 拦截器
 * 实现缓存更新功能（总是执行方法并更新缓存）
 */
export class CachePutInterceptor extends BaseInterceptor {
  /**
   * 执行拦截器逻辑
   */
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    // 从原型方法获取元数据
    let metadata = getCachePutMetadata(originalMethod);

    if (!metadata && target && typeof target === 'object') {
      const prototype = Object.getPrototypeOf(target);
      if (prototype && typeof propertyKey === 'string') {
        const protoMethod = prototype[propertyKey];
        if (protoMethod) {
          metadata = getCachePutMetadata(protoMethod);
        }
      }
    }

    if (!metadata) {
      // 没有缓存更新元数据，直接执行原方法
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 获取缓存服务
    let cacheService: CacheService;
    try {
      cacheService = container.resolve<CacheService>(CACHE_SERVICE_TOKEN);
    } catch {
      // 缓存服务未注册，直接执行原方法
      console.warn('[CachePutInterceptor] CacheService not registered, skipping cache update');
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 执行原方法
    const result = await Promise.resolve(originalMethod.apply(target, args));

    // 检查条件表达式（如果有）
    if (metadata.condition) {
      // 简单的条件评估
      if (metadata.condition === 'false') {
        return result;
      }
    }

    // 生成缓存键
    const cacheKey = metadata.key
      ? resolveKeyTemplate(metadata.key, args)
      : generateDefaultCacheKey(target, propertyKey, args, metadata.keyPrefix);

    // 更新缓存
    await cacheService.set(cacheKey, result, metadata.ttl);

    return result;
  }
}
