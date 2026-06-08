import { Injectable } from '../di/decorators';
import type { CacheStore, CacheModuleOptions } from './types';
import { CACHE_OPTIONS_TOKEN } from './types';
import { Inject } from '../di/decorators';

/**
 * 缓存服务
 */
@Injectable()
export class CacheService {
  private store: CacheStore;
  private defaultTtl: number;
  private keyPrefix: string;

  public constructor(
    @Inject(CACHE_OPTIONS_TOKEN) options: CacheModuleOptions | CacheStore,
  ) {
    const resolvedOptions: CacheModuleOptions = isCacheStore(options)
      ? { store: options }
      : options;
    this.store = resolvedOptions.store!;
    this.defaultTtl = resolvedOptions.defaultTtl ?? 3600000; // 1 小时
    this.keyPrefix = resolvedOptions.keyPrefix ?? '';
  }

  /**
   * 获取缓存值
   * @param key - 缓存键
   * @returns 缓存值，如果不存在则返回 undefined
   */
  public async get<T = any>(key: string): Promise<T | undefined> {
    return this.store.get<T>(this.getKey(key));
  }

  /**
   * 设置缓存值
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttl - 过期时间（毫秒），0 表示永不过期，undefined 使用默认 TTL
   * @returns 是否设置成功
   */
  public async set<T = any>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<boolean> {
    const finalTtl = ttl !== undefined ? ttl : this.defaultTtl;
    return this.store.set(this.getKey(key), value, finalTtl);
  }

  /**
   * 删除缓存
   * @param key - 缓存键
   * @returns 是否删除成功
   */
  public async delete(key: string): Promise<boolean> {
    return this.store.delete(this.getKey(key));
  }

  /**
   * 检查缓存是否存在
   * @param key - 缓存键
   * @returns 是否存在
   */
  public async has(key: string): Promise<boolean> {
    return this.store.has(this.getKey(key));
  }

  /**
   * 清空所有缓存
   * @returns 是否清空成功
   */
  public async clear(): Promise<boolean> {
    return this.store.clear();
  }

  /**
   * 获取多个缓存值
   * @param keys - 缓存键数组
   * @returns 缓存值映射
   */
  public async getMany<T = any>(
    keys: string[],
  ): Promise<Map<string, T>> {
    const prefixedKeys = keys.map((k) => this.getKey(k));
    const result = await this.store.getMany<T>(prefixedKeys);

    // 移除前缀
    const map = new Map<string, T>();
    for (const [key, value] of result.entries()) {
      map.set(key.replace(this.keyPrefix, ''), value);
    }

    return map;
  }

  /**
   * 设置多个缓存值
   * @param entries - 缓存条目数组
   * @param ttl - 过期时间（毫秒），0 表示永不过期，undefined 使用默认 TTL
   * @returns 是否设置成功
   */
  public async setMany<T = any>(
    entries: Array<{ key: string; value: T }>,
    ttl?: number,
  ): Promise<boolean> {
    const finalTtl = ttl !== undefined ? ttl : this.defaultTtl;
    const prefixedEntries = entries.map(({ key, value }) => ({
      key: this.getKey(key),
      value,
    }));
    return this.store.setMany(prefixedEntries, finalTtl);
  }

  /**
   * 删除多个缓存
   * @param keys - 缓存键数组
   * @returns 删除成功的键数组
   */
  public async deleteMany(keys: string[]): Promise<string[]> {
    const prefixedKeys = keys.map((k) => this.getKey(k));
    const deleted = await this.store.deleteMany(prefixedKeys);
    return deleted.map((k) => k.replace(this.keyPrefix, ''));
  }

  /**
   * 获取或设置缓存（如果不存在则执行函数并缓存结果）
   * @param key - 缓存键
   * @param factory - 值工厂函数
   * @param ttl - 过期时间（毫秒），0 表示永不过期，undefined 使用默认 TTL
   * @returns 缓存值
   */
  public async getOrSet<T = unknown>(
    key: string,
    factory: () => Promise<T> | T,
    ttl?: number,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    await this.set(key, value, ttl);
    return value;
  }

  /**
   * 获取带前缀的键
   */
  private getKey(key: string): string {
    return this.keyPrefix ? `${this.keyPrefix}${key}` : key;
  }
}

function isCacheStore(value: CacheModuleOptions | CacheStore): value is CacheStore {
  return typeof (value as CacheStore).get === 'function' &&
    typeof (value as CacheStore).set === 'function' &&
    typeof (value as CacheStore).delete === 'function';
}
