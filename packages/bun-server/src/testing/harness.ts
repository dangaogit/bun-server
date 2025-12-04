import { performance } from 'node:perf_hooks';

export interface BenchmarkResult {
  name: string;
  iterations: number;
  durationMs: number;
  opsPerSecond: number;
}

export interface StressResult {
  name: string;
  iterations: number;
  concurrency: number;
  durationMs: number;
  errors: number;
}

/**
 * 简单性能压测工具，方便在 bun:test 中快速基准测试组件
 */
export class PerformanceHarness {
  public static async benchmark(
    name: string,
    iterations: number,
    runner: (iteration: number) => void | Promise<void>,
  ): Promise<BenchmarkResult> {
    if (iterations <= 0) {
      throw new Error('iterations must be greater than 0');
    }

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      await runner(i);
    }
    const durationMs = performance.now() - start;
    const opsPerSecond = iterations / Math.max(durationMs / 1000, 0.0001);

    return {
      name,
      iterations,
      durationMs,
      opsPerSecond,
    };
  }
}

/**
 * 简单压力测试运行器，支持并发执行任务并收集错误
 */
export class StressTester {
  public static async run(
    name: string,
    iterations: number,
    concurrency: number,
    task: (iteration: number) => Promise<void>,
  ): Promise<StressResult> {
    if (iterations <= 0) {
      throw new Error('iterations must be greater than 0');
    }
    if (concurrency <= 0) {
      throw new Error('concurrency must be greater than 0');
    }

    let next = 0;
    let errors = 0;
    const start = performance.now();

    const worker = async () => {
      while (true) {
        const current = next;
        next += 1;
        if (current >= iterations) {
          break;
        }
        try {
          await task(current);
        } catch (error) {
          errors += 1;
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, iterations) }, () => worker());
    await Promise.all(workers);

    const durationMs = performance.now() - start;
    return {
      name,
      iterations,
      concurrency: Math.min(concurrency, iterations),
      durationMs,
      errors,
    };
  }
}

