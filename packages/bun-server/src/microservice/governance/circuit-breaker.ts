import { CircuitBreakerState, type CircuitBreakerOptions, type CircuitBreakerStats } from './types';

export { CircuitBreakerState, type CircuitBreakerOptions, type CircuitBreakerStats } from './types';

/**
 * 请求记录
 */
interface RequestRecord {
  timestamp: number;
  success: boolean;
}

/**
 * 熔断器实现
 */
export class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private readonly options: Required<CircuitBreakerOptions>;
  private readonly records: RequestRecord[] = [];
  private openTime?: number;
  private halfOpenTestCount: number = 0;

  public constructor(options: CircuitBreakerOptions = {}) {
    this.options = {
      failureThreshold: options.failureThreshold ?? 0.5,
      timeWindow: options.timeWindow ?? 60000,
      minimumRequests: options.minimumRequests ?? 10,
      openDuration: options.openDuration ?? 60000,
      halfOpenRequests: options.halfOpenRequests ?? 3,
      timeout: options.timeout ?? 5000,
    };
  }

  /**
   * 执行请求（带熔断保护）
   */
  public async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T> | T,
  ): Promise<T> {
    // 检查熔断器状态
    this.updateState();

    if (this.state === CircuitBreakerState.OPEN) {
      // 熔断器开启，执行降级逻辑
      if (fallback) {
        return Promise.resolve(fallback());
      }
      throw new Error('Circuit breaker is OPEN');
    }

    if (this.state === CircuitBreakerState.HALF_OPEN) {
      // 半开状态，限制请求数
      if (this.halfOpenTestCount >= this.options.halfOpenRequests) {
        if (fallback) {
          return Promise.resolve(fallback());
        }
        throw new Error('Circuit breaker is HALF_OPEN, test requests limit reached');
      }
      this.halfOpenTestCount++;
    }

    const startTime = Date.now();
    let success = false;

    try {
      // 执行请求（带超时）
      const result = await Promise.race([
        fn(),
        this.createTimeoutPromise(),
      ]);

      success = true;
      this.recordRequest(success);
      return result as T;
    } catch (error) {
      success = false;
      this.recordRequest(success);
      throw error;
    } finally {
      // 更新状态
      this.updateState();
    }
  }

  /**
   * 记录请求
   */
  private recordRequest(success: boolean): void {
    const now = Date.now();
    this.records.push({
      timestamp: now,
      success,
    });

    // 清理过期记录
    this.cleanupRecords(now);
  }

  /**
   * 清理过期记录
   */
  private cleanupRecords(now: number): void {
    const cutoff = now - this.options.timeWindow;
    while (this.records.length > 0 && this.records[0]!.timestamp < cutoff) {
      this.records.shift();
    }
  }

  /**
   * 更新熔断器状态
   */
  private updateState(): void {
    const now = Date.now();

    switch (this.state) {
      case CircuitBreakerState.CLOSED:
        // 检查是否需要开启熔断
        if (this.shouldOpen()) {
          this.state = CircuitBreakerState.OPEN;
          this.openTime = now;
        }
        break;

      case CircuitBreakerState.OPEN:
        // 检查是否可以进入半开状态
        if (this.openTime && now - this.openTime >= this.options.openDuration) {
          this.state = CircuitBreakerState.HALF_OPEN;
          this.halfOpenTestCount = 0;
          this.openTime = undefined;
        }
        break;

      case CircuitBreakerState.HALF_OPEN:
        // 半开状态下，根据测试结果决定状态
        if (this.shouldClose()) {
          this.state = CircuitBreakerState.CLOSED;
          this.halfOpenTestCount = 0;
        } else if (this.shouldOpen()) {
          this.state = CircuitBreakerState.OPEN;
          this.openTime = now;
          this.halfOpenTestCount = 0;
        }
        break;
    }
  }

  /**
   * 判断是否应该开启熔断
   */
  private shouldOpen(): boolean {
    if (this.records.length < this.options.minimumRequests) {
      return false;
    }

    const failureCount = this.records.filter((r) => !r.success).length;
    const failureRate = failureCount / this.records.length;

    return failureRate >= this.options.failureThreshold;
  }

  /**
   * 判断是否应该关闭熔断（半开状态下）
   */
  private shouldClose(): boolean {
    if (this.halfOpenTestCount === 0) {
      return false;
    }

    // 检查最近的测试请求是否都成功
    const recentRecords = this.records.slice(-this.halfOpenTestCount);
    return recentRecords.every((r) => r.success);
  }

  /**
   * 创建超时 Promise
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${this.options.timeout}ms`));
      }, this.options.timeout);
    });
  }

  /**
   * 获取当前状态
   */
  public getState(): CircuitBreakerState {
    this.updateState();
    return this.state;
  }

  /**
   * 获取统计信息
   */
  public getStats(): CircuitBreakerStats {
    const now = Date.now();
    this.cleanupRecords(now);

    const totalRequests = this.records.length;
    const failureRequests = this.records.filter((r) => !r.success).length;
    const successRequests = totalRequests - failureRequests;
    const failureRate = totalRequests > 0 ? failureRequests / totalRequests : 0;

    const lastFailure = this.records.findLast((r) => !r.success);

    return {
      state: this.state,
      totalRequests,
      successRequests,
      failureRequests,
      failureRate,
      lastFailureTime: lastFailure?.timestamp,
      openTime: this.openTime,
    };
  }

  /**
   * 重置熔断器
   */
  public reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.records.length = 0;
    this.openTime = undefined;
    this.halfOpenTestCount = 0;
  }
}

