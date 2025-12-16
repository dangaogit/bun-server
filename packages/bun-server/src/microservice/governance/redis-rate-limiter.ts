import type { RateLimiterOptions } from './types';

/**
 * Redis 限流器选项
 */
export interface RedisRateLimiterOptions {
  /**
   * Redis 客户端（需要用户提供）
   * 支持任何兼容的 Redis 客户端接口
   */
  client: {
    /**
     * 获取键值
     */
    get(key: string): Promise<string | null>;

    /**
     * 设置键值（带过期时间）
     */
    set(
      key: string,
      value: string,
      options?: { PX?: number; EX?: number },
    ): Promise<void>;

    /**
     * 删除键
     */
    del(key: string): Promise<void>;

    /**
     * 递增键值（原子操作）
     */
    incr(key: string): Promise<number>;

    /**
     * 设置键的过期时间
     */
    expire(key: string, seconds: number): Promise<void>;

    /**
     * 检查键是否存在
     */
    exists(key: string): Promise<number>;
  };

  /**
   * 键前缀
   * @default 'ratelimit:'
   */
  keyPrefix?: string;
}

/**
 * Redis 限流器实现（分布式限流）
 * 支持多个服务实例共享限流状态
 */
export class RedisRateLimiter {
  private readonly client: RedisRateLimiterOptions['client'];
  private readonly keyPrefix: string;
  private readonly options: Required<
    Pick<RateLimiterOptions, 'requestsPerSecond' | 'timeWindow'>
  >;

  public constructor(
    redisOptions: RedisRateLimiterOptions,
    rateLimiterOptions: RateLimiterOptions = {},
  ) {
    this.client = redisOptions.client;
    this.keyPrefix = redisOptions.keyPrefix ?? 'ratelimit:';
    this.options = {
      requestsPerSecond: rateLimiterOptions.requestsPerSecond ?? 100,
      timeWindow: rateLimiterOptions.timeWindow ?? 1000,
    };
  }

  /**
   * 检查是否允许请求
   * @param key - 限流键（如服务名、IP 等）
   * @returns 是否允许请求
   */
  public async allow(key: string): Promise<boolean> {
    const redisKey = this.getKey(key);
    const windowSeconds = Math.ceil(this.options.timeWindow / 1000);

    try {
      // 使用 Redis INCR 原子操作递增计数器
      const count = await this.client.incr(redisKey);

      // 如果是第一次请求，设置过期时间
      if (count === 1) {
        await this.client.expire(redisKey, windowSeconds);
      }

      // 检查是否超过限制
      return count <= this.options.requestsPerSecond;
    } catch (error) {
      console.error('[RedisRateLimiter] Failed to check rate limit:', error);
      // 如果 Redis 操作失败，默认允许请求（fail-open 策略）
      return true;
    }
  }

  /**
   * 获取剩余请求数
   * @param key - 限流键
   * @returns 剩余请求数
   */
  public async getRemaining(key: string): Promise<number> {
    const redisKey = this.getKey(key);

    try {
      const countStr = await this.client.get(redisKey);
      if (!countStr) {
        return this.options.requestsPerSecond;
      }

      const count = parseInt(countStr, 10);
      return Math.max(0, this.options.requestsPerSecond - count);
    } catch (error) {
      console.error('[RedisRateLimiter] Failed to get remaining:', error);
      return this.options.requestsPerSecond;
    }
  }

  /**
   * 重置限流器
   * @param key - 限流键（可选，如果不提供则重置所有）
   */
  public async reset(key?: string): Promise<void> {
    if (key) {
      const redisKey = this.getKey(key);
      try {
        await this.client.del(redisKey);
      } catch (error) {
        console.error('[RedisRateLimiter] Failed to reset:', error);
      }
    } else {
      // 注意：重置所有键需要遍历所有匹配的键，这在生产环境中可能很慢
      // 建议使用具体的 key 进行重置
      console.warn(
        '[RedisRateLimiter] Resetting all keys is not supported. Please provide a specific key.',
      );
    }
  }

  /**
   * 生成 Redis 键
   */
  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }
}

