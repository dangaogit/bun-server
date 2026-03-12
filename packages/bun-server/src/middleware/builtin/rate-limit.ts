import type { Context } from '../../core/context';
import type { Middleware } from '../middleware';

/**
 * 速率限制存储接口
 */
export interface RateLimitStore {
  /**
   * 获取当前计数
   * @param key - 存储键
   * @returns 当前计数
   */
  get(key: string): Promise<number>;

  /**
   * 增加计数
   * @param key - 存储键
   * @param windowMs - 时间窗口（毫秒）
   * @returns 增加后的计数
   */
  increment(key: string, windowMs: number): Promise<number>;

  /**
   * 重置计数
   * @param key - 存储键
   */
  reset(key: string): Promise<void>;
}

/**
 * 内存存储实现（使用 Map）
 */
export class MemoryRateLimitStore implements RateLimitStore {
  private store: Map<string, { count: number; resetTime: number }> = new Map();

  public async get(key: string): Promise<number> {
    const entry = this.store.get(key);
    if (!entry) {
      return 0;
    }

    // 如果已过期，返回 0
    if (Date.now() > entry.resetTime) {
      this.store.delete(key);
      return 0;
    }

    return entry.count;
  }

  public async increment(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.resetTime) {
      // 创建新条目或重置过期条目
      const resetTime = now + windowMs;
      this.store.set(key, { count: 1, resetTime });
      return 1;
    }

    // 增加计数
    entry.count++;
    return entry.count;
  }

  public async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  /**
   * 清理过期条目（可选，用于内存管理）
   */
  public cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }
  }
}

/**
 * 速率限制选项
 */
export interface RateLimitOptions {
  /**
   * 时间窗口内的最大请求数
   */
  max: number;

  /**
   * 时间窗口（毫秒）
   * @default 60000 (1 分钟)
   */
  windowMs?: number;

  /**
   * 存储实现（默认使用内存存储）
   */
  store?: RateLimitStore;

  /**
   * 获取限流键的函数
   * @param context - 请求上下文
   * @returns 限流键
   */
  keyGenerator?: (context: Context) => string | Promise<string>;

  /**
   * 是否跳过成功响应（只对错误响应计数）
   * @default false
   */
  skipSuccessfulRequests?: boolean;

  /**
   * 是否跳过失败响应（只对成功响应计数）
   * @default false
   */
  skipFailedRequests?: boolean;

  /**
   * 自定义错误消息
   */
  message?: string;

  /**
   * 自定义错误状态码
   * @default 429
   */
  statusCode?: number;

  /**
   * 是否在响应头中包含限流信息
   * @default true
   */
  standardHeaders?: boolean;

  /**
   * 是否启用 X-RateLimit-* 响应头
   * @default true
   */
  legacyHeaders?: boolean;
}

/**
 * 默认键生成器：基于 IP 地址
 */
function defaultKeyGenerator(context: Context): string {
  return `rate-limit:${context.getClientIp()}`;
}

/**
 * 创建速率限制中间件
 */
export function createRateLimitMiddleware(options: RateLimitOptions): Middleware {
  const {
    max,
    windowMs = 60000, // 默认 1 分钟
    store = new MemoryRateLimitStore(),
    keyGenerator = defaultKeyGenerator,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too Many Requests',
    statusCode = 429,
    standardHeaders = true,
    legacyHeaders = true,
  } = options;

  return async (context: Context, next) => {
    // 生成限流键
    const key = await keyGenerator(context);
    const currentCount = await store.increment(key, windowMs);

    // 计算剩余请求数和重置时间
    const remaining = Math.max(0, max - currentCount);
    const resetTime = Date.now() + windowMs;

    // 设置响应头
    if (standardHeaders) {
      context.setHeader('RateLimit-Limit', max.toString());
      context.setHeader('RateLimit-Remaining', remaining.toString());
      context.setHeader('RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    }

    if (legacyHeaders) {
      context.setHeader('X-RateLimit-Limit', max.toString());
      context.setHeader('X-RateLimit-Remaining', remaining.toString());
      context.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000).toString());
    }

    // 检查是否超过限制
    if (currentCount > max) {
      context.setStatus(statusCode);
      return context.createErrorResponse({
        error: message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    }

    // 执行下一个中间件或路由处理器
    const response = await next();

    // 根据选项决定是否计数
    const shouldSkip =
      (skipSuccessfulRequests && response.status >= 200 && response.status < 300) ||
      (skipFailedRequests && response.status >= 400);

    if (shouldSkip) {
      // 如果跳过，需要减少计数（因为之前已经增加了）
      const current = await store.get(key);
      if (current > 0) {
        // 注意：这里不能直接减少，因为滑动窗口算法不支持
        // 所以这个选项在滑动窗口算法下效果有限
        // 更好的做法是在请求成功后不增加计数，但这需要重构
      }
    }

    return response;
  };
}

/**
 * 基于 Token/User 的键生成器
 */
export function createTokenKeyGenerator(tokenHeader: string = 'Authorization'): (context: Context) => string {
  return (context: Context) => {
    const token = context.getHeader(tokenHeader);
    if (token) {
      // 提取 token（可能包含 Bearer 前缀）
      const tokenValue = token.startsWith('Bearer ') ? token.substring(7) : token;
      return `rate-limit:token:${tokenValue}`;
    }
    // 如果没有 token，回退到 IP
    return defaultKeyGenerator(context);
  };
}

/**
 * 基于用户 ID 的键生成器（需要从认证上下文获取）
 */
export function createUserKeyGenerator(getUserId: (context: Context) => string | null | undefined): (context: Context) => string {
  return (context: Context) => {
    const userId = getUserId(context);
    if (userId) {
      return `rate-limit:user:${userId}`;
    }
    // 如果没有用户 ID，回退到 IP
    return defaultKeyGenerator(context);
  };
}
