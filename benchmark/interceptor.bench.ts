import {
  Container,
  InterceptorChain,
  InterceptorRegistry,
  PerformanceHarness,
} from '@dangao/bun-server';
import type { Context, Interceptor } from '@dangao/bun-server';

interface BenchmarkSummary {
  name: string;
  iterations: number;
  durationMs: number;
  opsPerSecond: number;
}

interface ThresholdCheck {
  metric: string;
  value: number;
  max?: number;
  min?: number;
}

class NoOpInterceptor implements Interceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

class SyncInterceptor implements Interceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    const methodName = propertyKey.toString();
    if (!methodName) {
      throw new Error('interceptor method name is empty');
    }
    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

class TestTarget {
  public value = 0;

  public async method(arg: number): Promise<number> {
    this.value += arg;
    return this.value;
  }

  public syncMethod(arg: number): number {
    this.value += arg;
    return this.value;
  }
}

async function runBenchmarks(): Promise<void> {
  const container = new Container();
  const registry = new InterceptorRegistry();
  const target = new TestTarget();
  const asyncMethod = target.method.bind(target);
  const syncMethod = target.syncMethod.bind(target);

  const single = await PerformanceHarness.benchmark('interceptor:single', 10_000, async () => {
    await new NoOpInterceptor().execute(target, 'method', asyncMethod, [1], container);
  });

  const chain1 = await PerformanceHarness.benchmark('interceptor:chain-1', 10_000, async () => {
    await InterceptorChain.execute(
      [new NoOpInterceptor()],
      target,
      'method',
      asyncMethod,
      [1],
      container,
    );
  });

  const chain3 = await PerformanceHarness.benchmark('interceptor:chain-3', 10_000, async () => {
    await InterceptorChain.execute(
      [new NoOpInterceptor(), new NoOpInterceptor(), new NoOpInterceptor()],
      target,
      'method',
      asyncMethod,
      [1],
      container,
    );
  });

  const chain5 = await PerformanceHarness.benchmark('interceptor:chain-5', 10_000, async () => {
    await InterceptorChain.execute(
      Array.from({ length: 5 }, () => new NoOpInterceptor()),
      target,
      'method',
      asyncMethod,
      [1],
      container,
    );
  });

  const chain10 = await PerformanceHarness.benchmark('interceptor:chain-10', 10_000, async () => {
    await InterceptorChain.execute(
      Array.from({ length: 10 }, () => new NoOpInterceptor()),
      target,
      'method',
      asyncMethod,
      [1],
      container,
    );
  });

  const directAsync = await PerformanceHarness.benchmark('interceptor:direct-async', 10_000, async () => {
    await asyncMethod(1);
  });

  const chainAsync = await PerformanceHarness.benchmark('interceptor:chain-async', 10_000, async () => {
    await InterceptorChain.execute(
      [new NoOpInterceptor()],
      target,
      'method',
      asyncMethod,
      [1],
      container,
    );
  });

  const directSync = await PerformanceHarness.benchmark('interceptor:direct-sync', 100_000, async () => {
    syncMethod(1);
  });

  const chainSync = await PerformanceHarness.benchmark('interceptor:chain-sync', 100_000, async () => {
    await InterceptorChain.execute(
      [new SyncInterceptor()],
      target,
      'syncMethod',
      syncMethod,
      [1],
      container,
    );
  });

  const registerBench = await PerformanceHarness.benchmark('interceptor:registry-register', 10_000, async (i) => {
    const key = Symbol(`bench-${i}`);
    registry.register(key, new NoOpInterceptor(), 100);
  });

  const keys = Array.from({ length: 100 }, (_, index) => Symbol(`lookup-${index}`));
  for (const key of keys) {
    registry.register(key, new NoOpInterceptor(), 100);
  }

  const lookupBench = await PerformanceHarness.benchmark('interceptor:registry-lookup', 10_000, async (i) => {
    const key = keys[i % keys.length];
    registry.getInterceptors(key);
  });

  printBenchmarkSummary([
    single,
    chain1,
    chain3,
    chain5,
    chain10,
    directAsync,
    chainAsync,
    directSync,
    chainSync,
    registerBench,
    lookupBench,
  ]);

  const asyncOverhead = (chainAsync.durationMs / directAsync.durationMs - 1) * 100;
  const syncOverhead = (chainSync.durationMs / directSync.durationMs - 1) * 100;
  console.log('\nInterceptor Overhead');
  console.table([
    {
      metric: 'async chain overhead (%)',
      value: asyncOverhead.toFixed(2),
      baseline: '< 500',
    },
    {
      metric: 'sync chain overhead (%)',
      value: syncOverhead.toFixed(2),
      baseline: '< 1500',
    },
  ]);

  checkThresholds(
    [
      { metric: 'single interceptor ops/sec', value: single.opsPerSecond, min: 1000 },
      { metric: 'chain-3 interceptor ops/sec', value: chain3.opsPerSecond, min: 500 },
      { metric: 'registry lookup ops/sec', value: lookupBench.opsPerSecond, min: 5000 },
      { metric: 'async overhead (%)', value: asyncOverhead, max: 500 },
      { metric: 'sync overhead (%)', value: syncOverhead, max: 1500 },
    ],
    Bun.env.STRICT_BENCH === '1',
  );
}

function checkThresholds(checks: ThresholdCheck[], strict: boolean): void {
  const failures: string[] = [];
  for (const check of checks) {
    if (check.max !== undefined && check.value > check.max) {
      failures.push(`${check.metric}: ${check.value.toFixed(2)} > ${check.max}`);
    }
    if (check.min !== undefined && check.value < check.min) {
      failures.push(`${check.metric}: ${check.value.toFixed(2)} < ${check.min}`);
    }
  }
  if (failures.length === 0) {
    return;
  }

  console.warn('\n[interceptor.bench] threshold warnings');
  for (const failure of failures) {
    console.warn(`- ${failure}`);
  }

  if (strict) {
    throw new Error('benchmark threshold check failed in STRICT_BENCH mode');
  }
}

function printBenchmarkSummary(results: BenchmarkSummary[]): void {
  console.log('\nInterceptor Benchmark Results');
  console.table(
    results.map((result) => ({
      benchmark: result.name,
      iterations: result.iterations,
      'duration (ms)': result.durationMs.toFixed(2),
      'ops/sec': result.opsPerSecond.toFixed(0),
    })),
  );
}

if (import.meta.main) {
  runBenchmarks().catch((error) => {
    console.error('[interceptor.bench] benchmark failed', error);
    process.exit(1);
  });
}
