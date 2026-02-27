# 零配置集群

`ClusterManager` 提供零配置集群模式，自动派生多个 worker 进程，利用多核 CPU 提升吞吐量。

## ClusterManager 类

```ts
import { ClusterManager } from '@dangao/bun-server';

const manager = new ClusterManager({
  workers: 'auto',           // 或具体数字，'auto' 表示 CPU 核心数
  scriptPath: import.meta.path,
  port: 3300,
  hostname: '0.0.0.0',      // 可选
});

manager.start();
```

## 主进程 / 工作进程

- **ClusterManager.isWorker()**：判断当前进程是否为 worker
- **ClusterManager.getWorkerId()**：获取当前 worker ID（仅 worker 进程有效，主进程返回 -1）

主进程负责派生 worker，worker 进程运行应用逻辑。每个 worker 使用 `reusePort` 绑定同一端口。

## Linux reusePort 限制

`reusePort`（SO_REUSEPORT）仅在 **Linux** 上有效。macOS 和 Windows 会忽略该选项，多 worker 将无法共享同一端口，需在对应系统上单独验证行为。

## 使用示例

```ts
import { ClusterManager, Application, Controller, GET, Module } from '@dangao/bun-server';

const PORT = Number(process.env.PORT ?? 3300);

if (!ClusterManager.isWorker()) {
  // 主进程：派生 worker
  const manager = new ClusterManager({
    workers: process.env.WORKERS ? Number(process.env.WORKERS) : 'auto',
    scriptPath: import.meta.path,
    port: PORT,
  });
  manager.start();

  process.on('SIGINT', async () => {
    await manager.stop();
    process.exit(0);
  });
} else {
  // Worker 进程：运行应用
  @Controller('/api')
  class PerfController {
    @GET('/ping')
    public ping(): object {
      return { pong: true, worker: ClusterManager.getWorkerId() };
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
```

Worker 异常退出时，主进程会自动重启对应 worker。
