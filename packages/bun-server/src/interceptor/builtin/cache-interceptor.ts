import 'reflect-metadata';
import { BaseInterceptor } from '../base-interceptor';
import type { Container } from '../../di/container';
import type { Context } from '../../core/context';

/**
 * 缓存元数据键
 */
export const CACHE_METADATA_KEY = Symbol('@dangao/bun-server:interceptor:cache');

/**
 * 缓存配置选项
 */
export interface CacheOptions {
  /**
   * 缓存时间（毫秒）
   * @default 60000 (1分钟)
   */
  ttl?: number;
  /**
   * 自定义缓存键（可选）
   * 如果不提供，将使用方法名和参数生成键
   */
  key?: string;
}

/**
 * 缓存装饰器
 * 标记方法需要缓存结果
 * @param options - 缓存配置选项
 */
export function Cache(options: CacheOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const metadata = {
      ttl: options.ttl ?? 60000,
      key: options.key,
    };
    Reflect.defineMetadata(CACHE_METADATA_KEY, metadata, target, propertyKey);
  };
}

/**
 * 获取缓存元数据
 */
export function getCacheMetadata(
  target: unknown,
  propertyKey: string | symbol,
): CacheOptions | undefined {
  if (typeof target === 'object' && target !== null) {
    return Reflect.getMetadata(CACHE_METADATA_KEY, target, propertyKey);
  }
  return undefined;
}

/**
 * 缓存拦截器
 * 实现方法结果缓存功能
 */
export class CacheInterceptor extends BaseInterceptor {
  /**
   * 内存缓存存储
   * key: 缓存键
   * value: { data: 缓存数据, expires: 过期时间戳 }
   */
  private static cache = new Map<
    string,
    { data: unknown; expires: number }
  >();

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
    const metadata = this.getMetadata<CacheOptions>(
      target,
      propertyKey,
      CACHE_METADATA_KEY,
    );

    if (!metadata) {
      // 没有缓存元数据，直接执行原方法
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 生成缓存键
    const cacheKey = this.generateCacheKey(
      target,
      propertyKey,
      args,
      metadata.key,
    );

    // 检查缓存
    const cached = CacheInterceptor.cache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      // 缓存命中，返回缓存数据
      return cached.data as T;
    }

    // 执行原方法
    const result = await Promise.resolve(originalMethod.apply(target, args));

    // 缓存结果
    CacheInterceptor.cache.set(cacheKey, {
      data: result,
      expires: Date.now() + metadata.ttl!,
    });

    return result;
  }

  /**
   * 生成缓存键
   */
  private generateCacheKey(
    target: unknown,
    propertyKey: string | symbol,
    args: unknown[],
    customKey?: string,
  ): string {
    if (customKey) {
      return customKey;
    }

    // 使用类名、方法名和参数生成键
    const className = typeof target === 'object' && target !== null
      ? (target as any).constructor?.name || 'Unknown'
      : 'Unknown';
    const methodName = String(propertyKey);
    const argsKey = JSON.stringify(args);

    return `${className}:${methodName}:${argsKey}`;
  }

  /**
   * 清除所有缓存
   */
  public static clearCache(): void {
    CacheInterceptor.cache.clear();
  }

  /**
   * 清除指定键的缓存
   */
  public static clearCacheKey(key: string): void {
    CacheInterceptor.cache.delete(key);
  }

  /**
   * 获取缓存统计信息
   */
  public static getCacheStats(): {
    size: number;
    keys: string[];
  } {
    return {
      size: CacheInterceptor.cache.size,
      keys: Array.from(CacheInterceptor.cache.keys()),
    };
  }
}

