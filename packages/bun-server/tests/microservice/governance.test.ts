import { describe, expect, test, beforeEach } from 'bun:test';
import { CircuitBreaker, CircuitBreakerState } from '../../src/microservice/governance/circuit-breaker';
import { RateLimiter } from '../../src/microservice/governance/rate-limiter';
import { RetryStrategyImpl } from '../../src/microservice/governance';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      failureThreshold: 0.5,
      timeWindow: 60000,
      minimumRequests: 5,
    });
  });

  test('should start in CLOSED state', () => {
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  test('should execute successful request', async () => {
    const result = await circuitBreaker.execute(async () => {
      return { success: true };
    });

    expect(result).toEqual({ success: true });
    expect(circuitBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });

  test('should use fallback when circuit is open', async () => {
    // 模拟多次失败以打开熔断器
    for (let i = 0; i < 10; i++) {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('Service error');
        });
      } catch {
        // 忽略错误
      }
    }

    // 熔断器应该打开
    const fallback = async () => ({ fallback: true });
    const result = await circuitBreaker.execute(async () => {
      throw new Error('Service error');
    }, fallback);

    expect(result).toEqual({ fallback: true });
  });
});

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      requestsPerSecond: 10,
      timeWindow: 1000,
    });
  });

  test('should allow requests within limit', async () => {
    for (let i = 0; i < 10; i++) {
      const allowed = await rateLimiter.allow('test-key');
      expect(allowed).toBe(true);
    }
  });

  test('should reject requests exceeding limit', async () => {
    // 先允许 10 个请求
    for (let i = 0; i < 10; i++) {
      await rateLimiter.allow('test-key');
    }

    // 第 11 个请求应该被拒绝
    const allowed = await rateLimiter.allow('test-key');
    expect(allowed).toBe(false);
  });

  test('should get remaining requests', () => {
    rateLimiter.allow('test-key');
    const remaining = rateLimiter.getRemaining('test-key');
    expect(remaining).toBeLessThan(10);
  });

  test('should reset rate limiter', async () => {
    // 使用完所有请求
    for (let i = 0; i < 10; i++) {
      await rateLimiter.allow('test-key');
    }

    rateLimiter.reset('test-key');
    const allowed = await rateLimiter.allow('test-key');
    expect(allowed).toBe(true);
  });
});

describe('RetryStrategy', () => {
  test('RetryStrategyImpl should retry with fixed delay', async () => {
    const strategy = new RetryStrategyImpl({
      maxRetries: 3,
      retryDelay: 10, // 使用较小的延迟以便测试快速完成
    });

    let attempts = 0;
    const result = await strategy.execute(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Retry needed');
      }
      return { success: true };
    });

    expect(result).toEqual({ success: true });
    expect(attempts).toBe(3);
  });

  test('RetryStrategyImpl should retry with exponential delay', async () => {
    const strategy = new RetryStrategyImpl({
      maxRetries: 3,
      retryDelay: 10,
      exponentialBackoff: true,
      baseDelay: 10,
      maxDelay: 1000,
    });

    let attempts = 0;
    const result = await strategy.execute(async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Retry needed');
      }
      return { success: true };
    });

    expect(result).toEqual({ success: true });
    expect(attempts).toBe(3);
  });

  test('should respect maxRetries limit', async () => {
    const strategy = new RetryStrategyImpl({
      maxRetries: 2,
      retryDelay: 10,
    });

    let attempts = 0;
    await expect(
      strategy.execute(async () => {
        attempts++;
        throw new Error('Always fail');
      }),
    ).rejects.toThrow('Always fail');

    expect(attempts).toBe(3); // 1 initial + 2 retries
  });
});

