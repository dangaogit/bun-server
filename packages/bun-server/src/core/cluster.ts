import { spawn } from 'bun';
import { LoggerManager } from '@dangao/logsmith';

export interface ClusterOptions {
  /**
   * 是否启用集群模式
   * @default false
   */
  enabled?: boolean;
  /**
   * Worker 数量。'auto' 表示使用 CPU 核心数
   * @default 'auto'
   */
  workers?: number | 'auto';
}

/**
 * 集群管理器
 * 自动派生 worker 进程，每个 worker 使用 reusePort 绑定相同端口
 */
export class ClusterManager {
  private readonly workerCount: number;
  private readonly workers: ReturnType<typeof spawn>[] = [];
  private readonly scriptPath: string;
  private readonly port: number;
  private readonly hostname?: string;

  public constructor(options: {
    workers: number | 'auto';
    scriptPath: string;
    port: number;
    hostname?: string;
  }) {
    this.workerCount =
      options.workers === 'auto' ? navigator.hardwareConcurrency : options.workers;
    this.scriptPath = options.scriptPath;
    this.port = options.port;
    this.hostname = options.hostname;
  }

  /**
   * 启动所有 worker 进程
   */
  public start(): void {
    const logger = LoggerManager.getLogger();
    logger.info(
      `[Cluster] Starting ${this.workerCount} workers on port ${this.port}`,
    );

    for (let i = 0; i < this.workerCount; i++) {
      const worker = spawn({
        cmd: ['bun', 'run', this.scriptPath],
        env: {
          ...process.env,
          PORT: String(this.port),
          REUSE_PORT: '1',
          CLUSTER_WORKER: '1',
          WORKER_ID: String(i),
          ...(this.hostname ? { HOSTNAME: this.hostname } : {}),
        },
        stdout: 'inherit',
        stderr: 'inherit',
      });
      this.workers.push(worker);
    }

    logger.info(
      `[Cluster] ${this.workerCount} workers started (reusePort mode)`,
    );

    // Monitor workers and auto-restart on crash
    this.monitorWorkers();
  }

  /**
   * 停止所有 worker 进程
   */
  public async stop(): Promise<void> {
    const logger = LoggerManager.getLogger();
    logger.info('[Cluster] Stopping all workers...');

    for (const worker of this.workers) {
      worker.kill('SIGTERM');
    }

    // Wait up to 5 seconds for workers to exit
    const timeout = setTimeout(() => {
      for (const worker of this.workers) {
        worker.kill('SIGKILL');
      }
    }, 5000);

    await Promise.all(this.workers.map((w) => w.exited));
    clearTimeout(timeout);

    this.workers.length = 0;
    logger.info('[Cluster] All workers stopped');
  }

  private monitorWorkers(): void {
    // For each worker, restart if it crashes unexpectedly
    for (let i = 0; i < this.workers.length; i++) {
      const index = i;
      this.workers[index].exited.then((exitCode) => {
        if (exitCode !== 0 && exitCode !== null) {
          const logger = LoggerManager.getLogger();
          logger.warn(
            `[Cluster] Worker ${index} exited with code ${exitCode}, restarting...`,
          );

          const newWorker = spawn({
            cmd: ['bun', 'run', this.scriptPath],
            env: {
              ...process.env,
              PORT: String(this.port),
              REUSE_PORT: '1',
              CLUSTER_WORKER: '1',
              WORKER_ID: String(index),
              ...(this.hostname ? { HOSTNAME: this.hostname } : {}),
            },
            stdout: 'inherit',
            stderr: 'inherit',
          });
          this.workers[index] = newWorker;
        }
      });
    }
  }

  /**
   * 检查当前进程是否为 cluster worker
   */
  public static isWorker(): boolean {
    return process.env.CLUSTER_WORKER === '1';
  }

  /**
   * 获取当前 worker ID（仅在 worker 进程中有效）
   */
  public static getWorkerId(): number {
    return Number(process.env.WORKER_ID ?? -1);
  }
}
