# Zero-Config Cluster

`ClusterManager` spawns multiple worker processes that share a single port via SO_REUSEPORT. Each worker runs your application; the master process monitors and restarts crashed workers.

## ClusterManager Class

```ts
const manager = new ClusterManager({
  workers: 'auto' | number,  // 'auto' = CPU cores
  scriptPath: import.meta.path,
  port: 3000,
  hostname?: string,
});

manager.start();
await manager.stop();
```

## Static Methods

- **ClusterManager.isWorker()**: Returns `true` in worker processes; `false` in master
- **ClusterManager.getWorkerId()**: Returns worker index (0, 1, ...) in workers; `-1` in master

## Master/Worker Pattern

```ts
if (!ClusterManager.isWorker()) {
  // Master: spawn workers
  const manager = new ClusterManager({
    workers: 'auto',
    scriptPath: import.meta.path,
    port: PORT,
  });
  manager.start();

  process.on('SIGINT', async () => {
    await manager.stop();
    process.exit(0);
  });
} else {
  // Worker: run app
  const app = new Application({
    port: PORT,
    reusePort: true,
    enableSignalHandlers: true,
  });
  app.registerModule(WorkerModule);
  await app.listen();
}
```

## Linux-Only: reusePort

SO_REUSEPORT works on Linux. On macOS and Windows it is ignored; the app may still run but only one worker will bind the port.

## Example

```ts
const PORT = Number(process.env.PORT ?? 3300);

if (!ClusterManager.isWorker()) {
  const manager = new ClusterManager({
    workers: process.env.WORKERS ? Number(process.env.WORKERS) : 'auto',
    scriptPath: import.meta.path,
    port: PORT,
  });
  manager.start();
  process.on('SIGINT', () => manager.stop().then(() => process.exit(0)));
} else {
  @Controller('/api')
  class PerfController {
    @GET('/ping')
    public ping(): object {
      return { pong: true, worker: ClusterManager.getWorkerId() };
    }
  }
  const app = new Application({ port: PORT, reusePort: true });
  app.registerModule(WorkerModule);
  await app.listen();
}
```
