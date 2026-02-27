/**
 * Zero-Config Cluster example using ClusterManager.
 *
 * ClusterManager auto-detects CPU cores and spawns workers.
 * Each worker binds to the same port with SO_REUSEPORT.
 *
 * NOTE: reusePort only works on Linux. macOS/Windows will silently
 * ignore the option.
 *
 * Usage:
 *   bun examples/04-real-world/perf/cluster-app.ts
 */

import { ClusterManager, Application, Controller, GET, Module } from '@dangao/bun-server';

const PORT = Number(process.env.PORT ?? 3300);

if (!ClusterManager.isWorker()) {
  // Master process: spawn workers
  const workers = process.env.WORKERS ? Number(process.env.WORKERS) : ('auto' as const);

  const manager = new ClusterManager({
    workers,
    scriptPath: import.meta.path,
    port: PORT,
  });

  manager.start();

  process.on('SIGINT', async () => {
    await manager.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await manager.stop();
    process.exit(0);
  });
} else {
  // Worker process
  @Controller('/api')
  class PerfController {
    @GET('/ping')
    public ping(): object {
      return { pong: true, worker: ClusterManager.getWorkerId() };
    }

    @GET('/json')
    public json(): object {
      return {
        message: 'Hello from worker ' + ClusterManager.getWorkerId(),
        timestamp: Date.now(),
      };
    }
  }

  @Module({ controllers: [PerfController] })
  class WorkerModule {}

  const app = new Application({
    port: PORT,
    reusePort: true,
    enableSignalHandlers: true,
  });
  app.registerModule(WorkerModule);
  await app.listen();
}
