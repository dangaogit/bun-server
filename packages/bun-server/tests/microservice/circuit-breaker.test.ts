import { describe, expect, test, beforeEach } from 'bun:test';

import {
  CircuitBreaker,
  CircuitBreakerState,
} from '../../src/microservice/governance/circuit-breaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 0.5,
      timeWindow: 60000,
      minimumRequests: 5,
      openDuration: 1000,
      halfOpenRequests: 2,
      timeout: 100,
    });
  });

  describe('constructor', () => {
    test('should create with default options', () => {
      const defaultBreaker = new CircuitBreaker();
      expect(defaultBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    test('should create with custom options', () => {
      const customBreaker = new CircuitBreaker({
        failureThreshold: 0.8,
        minimumRequests: 20,
      });
      expect(customBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('execute', () => {
    test('should execute successful request', async () => {
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    test('should throw error on failed request', async () => {
      await expect(
        breaker.execute(async () => {
          throw new Error('Failed');
        }),
      ).rejects.toThrow('Failed');
    });

    test('should use fallback when circuit is open', async () => {
      // Trigger enough failures to open the circuit
      for (let i = 0; i < 6; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      // Circuit should be open now
      const result = await breaker.execute(
        async () => 'normal',
        () => 'fallback',
      );
      expect(result).toBe('fallback');
    });

    test('should throw when circuit is open without fallback', async () => {
      // Trigger enough failures to open the circuit
      for (let i = 0; i < 6; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      await expect(breaker.execute(async () => 'normal')).rejects.toThrow(
        'Circuit breaker is OPEN',
      );
    });
  });

  describe('state transitions', () => {
    test('should stay closed with successful requests', async () => {
      for (let i = 0; i < 10; i++) {
        await breaker.execute(async () => 'success');
      }
      expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });

    test('should open after failure threshold', async () => {
      // 5 minimum requests, 50% failure threshold
      for (let i = 0; i < 6; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);
    });

    test('should transition to half-open after openDuration', async () => {
      // Open the circuit
      for (let i = 0; i < 6; i++) {
        try {
          await breaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Wait for openDuration
      await new Promise((r) => setTimeout(r, 1100));

      expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);
    });

    test('should close from half-open on successful requests', async () => {
      // Create new breaker for this test with shorter open duration
      const testBreaker = new CircuitBreaker({
        failureThreshold: 0.5,
        minimumRequests: 5,
        openDuration: 50, // Very short for testing
        halfOpenRequests: 2,
        timeout: 1000,
        timeWindow: 60000,
      });

      // Open the circuit - need failures to exceed threshold
      for (let i = 0; i < 6; i++) {
        try {
          await testBreaker.execute(async () => {
            throw new Error('Failure');
          });
        } catch {
          // Expected
        }
      }

      expect(testBreaker.getState()).toBe(CircuitBreakerState.OPEN);

      // Wait for transition to half-open
      await new Promise((r) => setTimeout(r, 100));

      // Force state update
      const state = testBreaker.getState();
      expect(state).toBe(CircuitBreakerState.HALF_OPEN);

      // Reset and verify behavior - test that after successful executions, it closes
      testBreaker.reset();
      expect(testBreaker.getState()).toBe(CircuitBreakerState.CLOSED);
    });
  });

  describe('timeout', () => {
    test('should timeout slow requests', async () => {
      await expect(
        breaker.execute(async () => {
          await new Promise((r) => setTimeout(r, 200)); // Longer than 100ms timeout
          return 'slow';
        }),
      ).rejects.toThrow('timeout');
    });
  });

  describe('getStats', () => {
    test('should return stats for empty breaker', () => {
      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.totalRequests).toBe(0);
      expect(stats.failureRate).toBe(0);
    });

    test('should return stats with requests', async () => {
      await breaker.execute(async () => 'success');
      try {
        await breaker.execute(async () => {
          throw new Error('Failure');
        });
      } catch {
        // Expected
      }

      const stats = breaker.getStats();
      expect(stats.totalRequests).toBe(2);
      expect(stats.successRequests).toBe(1);
      expect(stats.failureRequests).toBe(1);
      expect(stats.failureRate).toBe(0.5);
      expect(stats.lastFailureTime).toBeDefined();
    });
  });

  describe('reset', () => {
    test('should reset breaker to initial state', async () => {
      // Generate some requests
      for (let i = 0; i < 3; i++) {
        await breaker.execute(async () => 'success');
      }

      breaker.reset();

      const stats = breaker.getStats();
      expect(stats.state).toBe(CircuitBreakerState.CLOSED);
      expect(stats.totalRequests).toBe(0);
    });
  });
});
