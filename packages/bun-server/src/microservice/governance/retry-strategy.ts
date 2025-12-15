import type { RetryStrategy } from './types';

/**
 * 重试策略实现
 */
export class RetryStrategyImpl {
  private readonly options: Required<Pick<RetryStrategy, 'maxRetries' | 'retryDelay' | 'exponentialBackoff' | 'baseDelay' | 'maxDelay'>> & {
    shouldRetry?: RetryStrategy['shouldRetry'];
  };

  public constructor(options: RetryStrategy = {}) {
    this.options = {
      maxRetries: options.maxRetries ?? 3,
      retryDelay: options.retryDelay ?? 1000,
      exponentialBackoff: options.exponentialBackoff ?? false,
      baseDelay: options.baseDelay ?? 1000,
      maxDelay: options.maxDelay ?? 30000,
      shouldRetry: options.shouldRetry,
    };
  }

  /**
   * 执行带重试的请求
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // 检查是否应该重试
        if (attempt >= this.options.maxRetries) {
          break;
        }

        if (this.options.shouldRetry && !this.options.shouldRetry(lastError)) {
          break;
        }

        // 计算延迟时间
        const delay = this.calculateDelay(attempt);

        // 等待重试
        await this.sleep(delay);
      }
    }

    throw lastError ?? new Error('Retry failed');
  }

  /**
   * 计算重试延迟
   */
  private calculateDelay(attempt: number): number {
    if (!this.options.exponentialBackoff) {
      return this.options.retryDelay;
    }

    // 指数退避：baseDelay * 2^attempt
    const delay = this.options.baseDelay * Math.pow(2, attempt);
    return Math.min(delay, this.options.maxDelay);
  }

  /**
   * 休眠
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

