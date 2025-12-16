import type { RateLimiterOptions } from './types';

/**
 * 限流器实现（内存版）
 */
export class RateLimiter {
  private readonly options: Required<Pick<RateLimiterOptions, 'requestsPerSecond' | 'timeWindow'>>;
  private readonly requests: Map<string, number[]> = new Map();

  public constructor(options: RateLimiterOptions = {}) {
    this.options = {
      requestsPerSecond: options.requestsPerSecond ?? 100,
      timeWindow: options.timeWindow ?? 1000,
    };
  }

  /**
   * 检查是否允许请求
   * @param key - 限流键（如服务名、IP 等）
   * @returns 是否允许请求
   */
  public async allow(key: string): Promise<boolean> {
    const now = Date.now();
    const cutoff = now - this.options.timeWindow;

    // 获取该键的请求记录
    let timestamps = this.requests.get(key) ?? [];

    // 清理过期记录
    timestamps = timestamps.filter((ts) => ts > cutoff);

    // 检查是否超过限制
    if (timestamps.length >= this.options.requestsPerSecond) {
      // 更新记录
      this.requests.set(key, timestamps);
      return false;
    }

    // 添加新请求记录
    timestamps.push(now);
    this.requests.set(key, timestamps);

    return true;
  }

  /**
   * 获取剩余请求数
   * @param key - 限流键
   * @returns 剩余请求数
   */
  public getRemaining(key: string): number {
    const now = Date.now();
    const cutoff = now - this.options.timeWindow;

    const timestamps = this.requests.get(key) ?? [];
    const validTimestamps = timestamps.filter((ts) => ts > cutoff);

    return Math.max(0, this.options.requestsPerSecond - validTimestamps.length);
  }

  /**
   * 重置限流器
   */
  public reset(key?: string): void {
    if (key) {
      this.requests.delete(key);
    } else {
      this.requests.clear();
    }
  }
}

