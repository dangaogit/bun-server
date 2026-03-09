import {
  Container,
  Context,
  Injectable,
  Inject,
  MiddlewarePipeline,
  PerformanceHarness,
  Router,
} from '@dangao/bun-server';

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
  const routeCache = await benchmarkRouteCache();
  const middleware = await benchmarkMiddleware();
  const diCache = await benchmarkDiCache();
  const manyRoutes = await benchmarkManyRoutes();
  const manyMiddlewares = await benchmarkManyMiddlewares();

  printBenchmarkSummary([
    routeCache.noCache,
    routeCache.cached,
    middleware,
    diCache.first,
    diCache.cached,
    manyRoutes,
    manyMiddlewares,
  ]);

  const performanceRatio = routeCache.cached.durationMs / routeCache.noCache.durationMs;
  const diRatio = diCache.cached.durationMs / diCache.first.durationMs;

  console.log('\nOptimization Ratios');
  console.table([
    {
      metric: 'route cache ratio',
      value: performanceRatio.toFixed(3),
      baseline: '<= 1.15',
    },
    {
      metric: 'di cache ratio',
      value: diRatio.toFixed(3),
      baseline: '<= 1.50',
    },
  ]);

  checkThresholds(
    [
      { metric: 'route cache ratio', value: performanceRatio, max: 1.15 },
      { metric: 'route cached ops/sec', value: routeCache.cached.opsPerSecond, min: routeCache.noCache.opsPerSecond * 0.85 },
      { metric: 'middleware ops/sec', value: middleware.opsPerSecond, min: 1000 },
      { metric: 'di cache ratio', value: diRatio, max: 1.5 },
      { metric: 'di cached ops/sec', value: diCache.cached.opsPerSecond, min: 5000 },
      { metric: 'many routes ops/sec', value: manyRoutes.opsPerSecond, min: 200 },
      { metric: 'many middlewares ops/sec', value: manyMiddlewares.opsPerSecond, min: 50 },
    ],
    Bun.env.STRICT_BENCH === '1',
  );
}

async function benchmarkRouteCache(): Promise<{ noCache: BenchmarkSummary; cached: BenchmarkSummary }> {
  const createRouter = (): Router => {
    const router = new Router();
    for (let i = 0; i < 100; i++) {
      router.get(`/api/users/${i}`, (ctx: Context) => ctx.createResponse({ id: i }));
    }
    router.get('/api/users/:id', (ctx: Context) => ctx.createResponse({ id: ctx.getParam('id') }));
    return router;
  };

  const noCache = await PerformanceHarness.benchmark('optimization:route-no-cache', 10_000, async () => {
    const router = createRouter();
    return router.findRoute('GET', '/api/users/123');
  });

  const cachedRouter = createRouter();
  cachedRouter.findRoute('GET', '/api/users/123');
  const cached = await PerformanceHarness.benchmark('optimization:route-cached', 10_000, async () => {
    return cachedRouter.findRoute('GET', '/api/users/123');
  });

  return { noCache, cached };
}

async function benchmarkMiddleware(): Promise<BenchmarkSummary> {
  const pipeline = new MiddlewarePipeline();
  for (let i = 0; i < 50; i++) {
    pipeline.use(async (ctx, next) => await next());
  }

  const context = new Context(new Request('http://localhost:3000/test'));
  return await PerformanceHarness.benchmark('optimization:middleware-50', 1_000, async () => {
    return await pipeline.run(context, async () => new Response('ok'));
  });
}

async function benchmarkDiCache(): Promise<{ first: BenchmarkSummary; cached: BenchmarkSummary }> {
  @Injectable()
  class Level1 {
    public name = 'level1';
  }

  @Injectable()
  class Level2 {
    public constructor(@Inject(Level1) public level1: Level1) {}
  }

  @Injectable()
  class Level3 {
    public constructor(@Inject(Level2) public level2: Level2) {}
  }

  const container = new Container();
  container.register(Level1);
  container.register(Level2);
  container.register(Level3);

  const first = await PerformanceHarness.benchmark('optimization:di-first', 1_000, () => {
    return container.resolve(Level3);
  });

  const cached = await PerformanceHarness.benchmark('optimization:di-cached', 1_000, () => {
    return container.resolve(Level3);
  });

  return { first, cached };
}

async function benchmarkManyRoutes(): Promise<BenchmarkSummary> {
  const router = new Router();
  for (let i = 0; i < 1_000; i++) {
    router.get(`/api/items/${i}`, (ctx: Context) => ctx.createResponse({ id: i }));
  }
  return await PerformanceHarness.benchmark('optimization:many-routes', 100, async () => {
    return router.findRoute('GET', '/api/items/500');
  });
}

async function benchmarkManyMiddlewares(): Promise<BenchmarkSummary> {
  const pipeline = new MiddlewarePipeline();
  for (let i = 0; i < 200; i++) {
    pipeline.use(async (ctx, next) => await next());
  }
  const context = new Context(new Request('http://localhost:3000/test'));
  return await PerformanceHarness.benchmark('optimization:many-middlewares', 100, async () => {
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

  console.warn('\n[optimization.bench] threshold warnings');
  for (const failure of failures) {
    console.warn(`- ${failure}`);
  }

  if (strict) {
    throw new Error('benchmark threshold check failed in STRICT_BENCH mode');
  }
}

function printBenchmarkSummary(results: BenchmarkSummary[]): void {
  console.log('\nOptimization Benchmark Results');
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
    console.error('[optimization.bench] benchmark failed', error);
    process.exit(1);
  });
}
