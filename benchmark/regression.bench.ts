import { Application, Container, Context, MiddlewarePipeline, PerformanceHarness, RouteRegistry } from '@dangao/bun-server';

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

async function runBenchmarks(): Promise<void> {
  const routerHandle = await benchmarkRouterHandle();
  const appRequest = await benchmarkApplicationRequest();
  const diResolve = await benchmarkDiResolve();
  const middleware = await benchmarkMiddlewarePipeline();

  printBenchmarkSummary([routerHandle, appRequest, diResolve, middleware]);

  checkThresholds(
    [
      { metric: 'router handle duration', value: routerHandle.durationMs, max: 1000 },
      { metric: 'router handle ops/sec', value: routerHandle.opsPerSecond, min: 1000 },
      { metric: 'application request duration', value: appRequest.durationMs, max: 2000 },
      { metric: 'application request ops/sec', value: appRequest.opsPerSecond, min: 50 },
      { metric: 'di resolve duration', value: diResolve.durationMs, max: 100 },
      { metric: 'di resolve ops/sec', value: diResolve.opsPerSecond, min: 10_000 },
      { metric: 'middleware duration', value: middleware.durationMs, max: 500 },
      { metric: 'middleware ops/sec', value: middleware.opsPerSecond, min: 1000 },
    ],
    Bun.env.STRICT_BENCH === '1',
  );
}

async function benchmarkRouterHandle(): Promise<BenchmarkSummary> {
  const registry = RouteRegistry.getInstance();
  registry.get('/api/test', (ctx: Context) => {
    return ctx.createResponse({ message: 'ok' });
  });

  const router = registry.getRouter();
  const context = new Context(new Request('http://localhost:3000/api/test'));
  context.params = {};

  return await PerformanceHarness.benchmark('regression:router-handle', 1_000, async () => {
    await router.preHandle(context);
    return await router.handle(context);
  });
}

async function benchmarkApplicationRequest(): Promise<BenchmarkSummary> {
  const port = 3900;
  const app = new Application({ port });
  const registry = RouteRegistry.getInstance();
  registry.get('/api/ping', (ctx: Context) => {
    return ctx.createResponse({ status: 'ok' });
  });

  await app.listen();

  try {
    return await PerformanceHarness.benchmark('regression:application-request', 100, async () => {
      const response = await fetch(`http://localhost:${port}/api/ping`);
      await response.text();
      return response;
    });
  } finally {
    await app.stop();
  }
}

async function benchmarkDiResolve(): Promise<BenchmarkSummary> {
  class TestService {
    public value = 'test';
  }

  const container = new Container();
  container.register(TestService);

  return await PerformanceHarness.benchmark('regression:di-resolve', 10_000, () => {
    return container.resolve(TestService);
  });
}

async function benchmarkMiddlewarePipeline(): Promise<BenchmarkSummary> {
  const pipeline = new MiddlewarePipeline();
  pipeline.use(async (ctx, next) => await next());
  pipeline.use(async (ctx, next) => await next());

  const context = new Context(new Request('http://localhost:3000/test'));
  return await PerformanceHarness.benchmark('regression:middleware', 1_000, async () => {
    return await pipeline.run(context, async () => new Response('ok'));
  });
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

  console.warn('\n[regression.bench] threshold warnings');
  for (const failure of failures) {
    console.warn(`- ${failure}`);
  }

  if (strict) {
    throw new Error('benchmark threshold check failed in STRICT_BENCH mode');
  }
}

function printBenchmarkSummary(results: BenchmarkSummary[]): void {
  console.log('\nRegression Benchmark Results');
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
    console.error('[regression.bench] benchmark failed', error);
    process.exit(1);
  });
}
