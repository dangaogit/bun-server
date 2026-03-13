/**
 * 缓存存储接口
 */
export interface CacheStore {
  /**
   * 获取缓存值
   * @param key - 缓存键
   * @returns 缓存值，如果不存在则返回 undefined
   */
  get<T = unknown>(key: string): Promise<T | undefined>;

  /**
   * 设置缓存值
   * @param key - 缓存键
   * @param value - 缓存值
   * @param ttl - 过期时间（毫秒），0 表示永不过期
   * @returns 是否设置成功
   */
  set<T = unknown>(key: string, value: T, ttl?: number): Promise<boolean>;

  /**
   * 删除缓存
   * @param key - 缓存键
   * @returns 是否删除成功
   */
  delete(key: string): Promise<boolean>;

  /**
   * 检查缓存是否存在
   * @param key - 缓存键
   * @returns 是否存在
   */
  has(key: string): Promise<boolean>;

  /**
   * 清空所有缓存
   * @returns 是否清空成功
   */
  clear(): Promise<boolean>;

  /**
   * 获取多个缓存值
   * @param keys - 缓存键数组
   * @returns 缓存值映射
   */
  getMany<T = unknown>(keys: string[]): Promise<Map<string, T>>;

  /**
   * 设置多个缓存值
   * @param entries - 缓存条目数组
   * @param ttl - 过期时间（毫秒），0 表示永不过期
   * @returns 是否设置成功
   */
  setMany<T = unknown>(
    entries: Array<{ key: string; value: T }>,
    ttl?: number,
  ): Promise<boolean>;

  /**
   * 删除多个缓存
   * @param keys - 缓存键数组
   * @returns 删除成功的键数组
   */
  deleteMany(keys: string[]): Promise<string[]>;
}

/**
 * 内存缓存存储实现
 */
export class MemoryCacheStore implements CacheStore {
  private store: Map<
    string,
    { value: unknown; expiresAt?: number }
  > = new Map();

  private cleanupInterval?: ReturnType<typeof setInterval>;

  public constructor(options?: { cleanupInterval?: number }) {
    // 定期清理过期条目
    if (options?.cleanupInterval !== undefined) {
      this.cleanupInterval = setInterval(() => {
        this.cleanup();
      }, options.cleanupInterval);
    }
  }

  public async get<T = unknown>(key: string): Promise<T | undefined> {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  public async set<T = unknown>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<boolean> {
    const expiresAt = ttl && ttl > 0 ? Date.now() + ttl : undefined;
    this.store.set(key, { value, expiresAt });
    return true;
  }

  public async delete(key: string): Promise<boolean> {
    return this.store.delete(key);
  }

  public async has(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) {
      return false;
    }

    // 检查是否过期
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }

    return true;
  }

  public async clear(): Promise<boolean> {
    this.store.clear();
    return true;
  }

  public async getMany<T = unknown>(
    keys: string[],
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    const now = Date.now();

    for (const key of keys) {
      const entry = this.store.get(key);
      if (entry) {
        // 检查是否过期
        if (entry.expiresAt && now > entry.expiresAt) {
          this.store.delete(key);
          continue;
        }
        result.set(key, entry.value as T);
      }
    }

    return result;
  }

  public async setMany<T = unknown>(
    entries: Array<{ key: string; value: T }>,
    ttl?: number,
  ): Promise<boolean> {
    const expiresAt = ttl && ttl > 0 ? Date.now() + ttl : undefined;

    for (const { key, value } of entries) {
      this.store.set(key, { value, expiresAt });
    }

    return true;
  }

  public async deleteMany(keys: string[]): Promise<string[]> {
    const deleted: string[] = [];

    for (const key of keys) {
      if (this.store.delete(key)) {
        deleted.push(key);
      }
    }

    return deleted;
  }

  /**
   * 清理过期条目
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt && now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * 销毁存储，清理定时器
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
    this.store.clear();
  }
}

/**
 * Redis 缓存存储实现（需要 redis 包）
 */
export interface RedisCacheStoreOptions {
  /**
   * Redis 客户端（需要用户提供）
   */
  client: {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, options?: { PX?: number }): Promise<void>;
    del(key: string): Promise<void>;
    exists(key: string): Promise<number>;
    mget(keys: string[]): Promise<(string | null)[]>;
    mset(entries: Array<{ key: string; value: string }>): Promise<void>;
    flushdb(): Promise<void>;
  };
  /**
   * 键前缀
   * @default 'cache:'
   */
  keyPrefix?: string;
}

export class RedisCacheStore implements CacheStore {
  private client: RedisCacheStoreOptions['client'];
  private keyPrefix: string;

  public constructor(options: RedisCacheStoreOptions) {
    this.client = options.client;
    this.keyPrefix = options.keyPrefix ?? 'cache:';
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  public async get<T = unknown>(key: string): Promise<T | undefined> {
    const value = await this.client.get(this.getKey(key));
    if (value === null) {
      return undefined;
    }
    try {
      return JSON.parse(value) as T;
    } catch (_error) {
      return undefined;
    }
  }

  public async set<T = unknown>(
    key: string,
    value: T,
    ttl?: number,
  ): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttl && ttl > 0) {
        await this.client.set(this.getKey(key), serialized, { PX: ttl });
      } else {
        await this.client.set(this.getKey(key), serialized);
      }
      return true;
    } catch (_error) {
      return false;
    }
  }

  public async delete(key: string): Promise<boolean> {
    try {
      await this.client.del(this.getKey(key));
      return true;
    } catch (_error) {
      return false;
    }
  }

  public async has(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(this.getKey(key));
      return result === 1;
    } catch (_error) {
      return false;
    }
  }

  public async clear(): Promise<boolean> {
    try {
      await this.client.flushdb();
      return true;
    } catch (_error) {
      return false;
    }
  }

  public async getMany<T = unknown>(
    keys: string[],
  ): Promise<Map<string, T>> {
    const result = new Map<string, T>();
    if (keys.length === 0) {
      return result;
    }

    try {
      const prefixedKeys = keys.map((k) => this.getKey(k));
      const values = await this.client.mget(prefixedKeys);

      for (let i = 0; i < keys.length; i++) {
        const value = values[i];
        if (value !== null) {
          try {
            result.set(keys[i], JSON.parse(value) as T);
          } catch (_error) {
            // 忽略解析错误
          }
        }
      }
    } catch (_error) {
      // 忽略错误，返回空 Map
    }

    return result;
  }

  public async setMany<T = unknown>(
    entries: Array<{ key: string; value: T }>,
    ttl?: number,
  ): Promise<boolean> {
    if (entries.length === 0) {
      return true;
    }

    try {
      const redisEntries = entries.map(({ key, value }) => ({
        key: this.getKey(key),
        value: JSON.stringify(value),
      }));

      await this.client.mset(redisEntries);

      // 如果设置了 TTL，需要单独为每个键设置过期时间
      // 注意：这里假设 Redis 客户端支持 PX 选项，如果不支持，需要单独调用 EXPIRE
      if (ttl && ttl > 0) {
        // 由于 mset 可能不支持批量设置 TTL，这里需要单独处理
        // 实际实现可能需要根据具体的 Redis 客户端调整
        for (const entry of redisEntries) {
          await this.client.set(entry.key, entry.value, { PX: ttl });
        }
      }

      return true;
    } catch (_error) {
      return false;
    }
  }

  public async deleteMany(keys: string[]): Promise<string[]> {
    if (keys.length === 0) {
      return [];
    }

    try {
      const prefixedKeys = keys.map((k) => this.getKey(k));
      const deleted: string[] = [];

      // 注意：这里假设 Redis 客户端支持批量删除
      // 如果不支持，需要循环调用 del
      for (const key of prefixedKeys) {
        try {
          await this.client.del(key);
          deleted.push(key.replace(this.keyPrefix, ''));
        } catch (_error) {
          // 忽略单个删除错误
        }
      }

      return deleted;
    } catch (_error) {
      return [];
    }
  }
}

/**
 * CacheModule 配置选项
 */
export interface CacheModuleOptions {
  /**
   * 缓存存储实现
   * @default MemoryCacheStore
   */
  store?: CacheStore;

  /**
   * 默认 TTL（毫秒）
   * @default 3600000 (1 小时)
   */
  defaultTtl?: number;

  /**
   * 键前缀
   * @default ''
   */
  keyPrefix?: string;
}

/**
 * CacheService Token
 */
export const CACHE_SERVICE_TOKEN = Symbol(
  '@dangao/bun-server:cache:service',
);

/**
 * CacheModule Options Token
 */
export const CACHE_OPTIONS_TOKEN = Symbol('@dangao/bun-server:cache:options');
