import { PerformanceHarness, StressTester } from 'bun-server';
import { Container } from 'bun-server';
import { Injectable, Inject } from 'bun-server';

interface BenchmarkSummary {
  name: string;
  iterations: number;
  durationMs: number;
  opsPerSecond: number;
}

@Injectable()
class Repository {
  public findOne(id: string): string {
    return `user:${id}`;
  }
}

@Injectable()
class Service {
  public constructor(@Inject(Repository) private readonly repo: Repository) {}

  public getUser(id: string): string {
    return this.repo.findOne(id);
  }
}

async function runBenchmarks(): Promise<void> {
  const container = new Container();
  container.register(Repository);
  container.register(Service);

  const singletonBench = await PerformanceHarness.benchmark(
    'di:singleton-resolve',
    60_000,
    () => container.resolve(Repository),
  );

  const nestedBench = await PerformanceHarness.benchmark('di:nested-resolve', 25_000, () => {
    const svc = container.resolve<Service>(Service);
    if (!svc.getUser('1')) {
      throw new Error('unexpected response');
    }
  });

  const transientContainer = new Container();
  transientContainer.register(Repository);
  transientContainer.register(Service, { lifecycle: undefined, factory: () => new Service(new Repository()) });

  const transientBench = await PerformanceHarness.benchmark('di:factory-resolve', 10_000, () => {
    const svc = transientContainer.resolve<Service>(Service);
    svc.getUser('1');
  });

  printBenchmarkSummary([singletonBench, nestedBench, transientBench]);

  const stress = await StressTester.run('di:stress-resolve', 15_000, 48, async (iteration) => {
    const svc = container.resolve<Service>(Service);
    svc.getUser(String(iteration % 100));
  });

  console.log('\nDI Stress Test');
  console.table([
    {
      test: stress.name,
      iterations: stress.iterations,
      concurrency: stress.concurrency,
      'duration (ms)': stress.durationMs.toFixed(2),
      errors: stress.errors,
    },
  ]);
}

function printBenchmarkSummary(results: BenchmarkSummary[]): void {
  console.log('\nDI Benchmark Results');
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
    console.error('[di.bench] benchmark failed', error);
    process.exit(1);
  });
}

