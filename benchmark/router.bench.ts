import { PerformanceHarness, StressTester } from '@dangao/bun-server';
import { Router } from '@dangao/bun-server';
import { Context } from '@dangao/bun-server';

interface BenchmarkSummary {
  name: string;
  iterations: number;
  durationMs: number;
  opsPerSecond: number;
}

async function runBenchmarks(): Promise<void> {
  const router = new Router();
  const dynamicRouter = new Router();

  for (let i = 0; i < 100; i++) {
    router.get(`/static/${i}`, (ctx: Context) => ctx.createResponse({ index: i }));
    dynamicRouter.get(`/dynamic/:id/${i}`, (ctx: Context) =>
      ctx.createResponse({ id: ctx.getParam('id'), suffix: i }),
    );
  }

  const staticBench = await PerformanceHarness.benchmark('router:static-hit', 20_000, (iteration) => {
    const id = iteration % 100;
    const matched = router.findRoute('GET', `/static/${id}`);
    if (!matched) {
      throw new Error('router:static-hit miss happened');
    }
  });

  const dynamicBench = await PerformanceHarness.benchmark('router:dynamic-hit', 10_000, (iteration) => {
    const id = iteration % 100;
    const matched = dynamicRouter.findRoute('GET', `/dynamic/${iteration}/${id}`);
    if (!matched) {
      throw new Error('router:dynamic-hit miss happened');
    }
  });

  const handleBench = await PerformanceHarness.benchmark('router:handle', 5_000, async (iteration) => {
    const request = new Request(`http://localhost/static/${iteration % 100}`);
    const context = new Context(request);
    const response = await router.handle(context);
    if (!response) {
      throw new Error('router:handle returned undefined');
    }
  });

  printBenchmarkSummary([staticBench, dynamicBench, handleBench]);

  const stress = await StressTester.run('router:stress-handle', 5_000, 32, async (iteration) => {
    const target = iteration % 2 === 0 ? router : dynamicRouter;
    const url =
      target === router
        ? `http://localhost/static/${iteration % 100}`
        : `http://localhost/dynamic/${iteration}/${iteration % 100}`;
    const context = new Context(new Request(url));
    await target.handle(context);
  });

  printStressSummary(stress);
}

function printBenchmarkSummary(results: BenchmarkSummary[]): void {
  console.log('\nRouter Benchmark Results');
  console.table(
    results.map((result) => ({
      benchmark: result.name,
      iterations: result.iterations,
      'duration (ms)': result.durationMs.toFixed(2),
      'ops/sec': result.opsPerSecond.toFixed(0),
    })),
  );
}

function printStressSummary(result: Awaited<ReturnType<typeof StressTester.run>>): void {
  console.log('\nRouter Stress Test');
  console.table([
    {
      test: result.name,
      iterations: result.iterations,
      concurrency: result.concurrency,
      'duration (ms)': result.durationMs.toFixed(2),
      errors: result.errors,
    },
  ]);
}

if (import.meta.main) {
  runBenchmarks().catch((error) => {
    console.error('[router.bench] benchmark failed', error);
    process.exit(1);
  });
}

