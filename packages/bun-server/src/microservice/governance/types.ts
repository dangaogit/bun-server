/**
 * 熔断器状态
 */
export enum CircuitBreakerState {
  /**
   * 关闭状态：正常处理请求
   */
  CLOSED = 'CLOSED',

  /**
   * 开启状态：拒绝请求，直接返回错误
   */
  OPEN = 'OPEN',

  /**
   * 半开状态：允许少量请求通过，用于测试服务是否恢复
   */
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * 熔断器配置选项
 */
export interface CircuitBreakerOptions {
  /**
   * 失败率阈值（0-1）
   * 当失败率超过此值时，熔断器开启
   * @default 0.5
   */
  failureThreshold?: number;

  /**
   * 时间窗口（毫秒）
   * 在此时间窗口内统计失败率
   * @default 60000
   */
  timeWindow?: number;

  /**
   * 最小请求数
   * 在时间窗口内至少需要这么多请求才会触发熔断
   * @default 10
   */
  minimumRequests?: number;

  /**
   * 熔断持续时间（毫秒）
   * 熔断器开启后，持续多长时间才进入半开状态
   * @default 60000
   */
  openDuration?: number;

  /**
   * 半开状态下的测试请求数
   * 在半开状态下允许通过的请求数
   * @default 3
   */
  halfOpenRequests?: number;

  /**
   * 超时时间（毫秒）
   * 请求超过此时间视为失败
   * @default 5000
   */
  timeout?: number;
}

/**
 * 熔断器统计信息
 */
export interface CircuitBreakerStats {
  /**
   * 当前状态
   */
  state: CircuitBreakerState;

  /**
   * 总请求数
   */
  totalRequests: number;

  /**
   * 成功请求数
   */
  successRequests: number;

  /**
   * 失败请求数
   */
  failureRequests: number;

  /**
   * 当前失败率
   */
  failureRate: number;

  /**
   * 最后失败时间
   */
  lastFailureTime?: number;

  /**
   * 熔断开启时间
   */
  openTime?: number;
}

/**
 * 限流器配置选项
 */
export interface RateLimiterOptions {
  /**
   * 每秒允许的请求数
   * @default 100
   */
  requestsPerSecond?: number;

  /**
   * 时间窗口（毫秒）
   * @default 1000
   */
  timeWindow?: number;

  /**
   * 是否使用分布式限流（需要 Redis）
   * @default false
   */
  distributed?: boolean;

  /**
   * Redis 配置（分布式限流时使用）
   */
  redis?: {
    host: string;
    port: number;
    password?: string;
  };
}

/**
 * 重试策略配置
 */
export interface RetryStrategy {
  /**
   * 最大重试次数
   * @default 3
   */
  maxRetries?: number;

  /**
   * 重试延迟（毫秒）
   * @default 1000
   */
  retryDelay?: number;

  /**
   * 是否使用指数退避
   * @default false
   */
  exponentialBackoff?: boolean;

  /**
   * 指数退避的基础延迟（毫秒）
   * @default 1000
   */
  baseDelay?: number;

  /**
   * 指数退避的最大延迟（毫秒）
   * @default 30000
   */
  maxDelay?: number;

  /**
   * 重试条件：哪些错误应该重试
   * @param error - 错误对象
   * @returns 是否应该重试
   */
  shouldRetry?: (error: Error) => boolean;
}

/**
 * 重试决策
 */
export interface RetryDecision {
  /**
   * 是否重试
   */
  retry: boolean;

  /**
   * 延迟时间（毫秒）
   */
  delay: number;
}

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

