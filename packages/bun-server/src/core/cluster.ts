import { spawn } from 'bun';
import { LoggerManager } from '@dangao/logsmith';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdirSync, rmSync, existsSync } from 'fs';

/**
 * 集群模式
 * - 'reusePort': 使用 SO_REUSEPORT 内核分发（仅 Linux 有效）
 * - 'proxy': 主进程通过 Unix socket round-robin 代理转发（跨平台，有额外开销）
 * - 'auto': 默认使用 reusePort
 */
export type ClusterMode = 'reusePort' | 'proxy' | 'auto';

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
  /**
   * 集群模式
   * @default 'auto'
   */
  mode?: ClusterMode;
}

/**
 * 集群管理器
 * 自动派生 worker 进程，支持两种模式：
 * - reusePort：每个 worker 使用 SO_REUSEPORT 绑定相同端口（Linux 内核分发）
 * - proxy：主进程 round-robin 代理转发到 worker 随机端口（跨平台）
 */
export class ClusterManager {
  private readonly workerCount: number;
  private readonly workers: ReturnType<typeof spawn>[] = [];
  private readonly scriptPath: string;
  private readonly port: number;
  private readonly hostname?: string;
  private readonly mode: 'reusePort' | 'proxy';
  private proxyServer?: ReturnType<typeof Bun.serve>;
  private socketPaths: string[] = [];
  private roundRobinIndex = 0;
  private socketDir?: string;

  public constructor(options: {
    workers: number | 'auto';
    scriptPath: string;
    port: number;
    hostname?: string;
    mode?: ClusterMode;
  }) {
    this.workerCount =
      options.workers === 'auto' ? navigator.hardwareConcurrency : options.workers;
    this.scriptPath = options.scriptPath;
    this.port = options.port;
    this.hostname = options.hostname;

    const requestedMode = options.mode ?? 'auto';
    this.mode = requestedMode === 'auto' ? 'reusePort' : requestedMode;
  }

  /**
   * 获取已解析的集群模式
   */
  public getMode(): 'reusePort' | 'proxy' {
    return this.mode;
  }

  /**
   * 启动所有 worker 进程
   *
   * - reusePort 模式：立即返回（workers 异步启动）
   * - proxy 模式：等待所有 worker 就绪后启动代理服务器再返回
   */
  public async start(): Promise<void> {
    if (this.mode === 'reusePort') {
      this.startReusePort();
    } else {
      await this.startProxy();
    }
  }

  /**
   * 停止所有 worker 进程
   */
  public async stop(): Promise<void> {
    const logger = LoggerManager.getLogger();
    logger.info('[Cluster] Stopping all workers...');

    if (this.proxyServer) {
      this.proxyServer.stop();
      this.proxyServer = undefined;
    }

    for (const worker of this.workers) {
      worker.kill('SIGTERM');
    }

    const timeout = setTimeout(() => {
      for (const worker of this.workers) {
        worker.kill('SIGKILL');
      }
    }, 5000);

    await Promise.all(this.workers.map((w) => w.exited));
    clearTimeout(timeout);

    this.workers.length = 0;
    this.socketPaths.length = 0;

    if (this.socketDir) {
      try {
        rmSync(this.socketDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
      this.socketDir = undefined;
    }

    logger.info('[Cluster] All workers stopped');
  }

  // ── reusePort mode ──────────────────────────────────────────────

  private startReusePort(): void {
    const logger = LoggerManager.getLogger();
    logger.info(
      `[Cluster] Starting ${this.workerCount} workers on port ${this.port}`,
    );

    for (let i = 0; i < this.workerCount; i++) {
      this.workers.push(this.spawnReusePortWorker(i));
    }

    logger.info(
      `[Cluster] ${this.workerCount} workers started (reusePort mode)`,
    );

    this.monitorReusePortWorkers();
  }

  private spawnReusePortWorker(index: number): ReturnType<typeof spawn> {
    return spawn({
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
  }

  private monitorReusePortWorkers(): void {
    for (let i = 0; i < this.workers.length; i++) {
      const index = i;
      this.workers[index]!.exited.then((exitCode) => {
        if (exitCode !== 0 && exitCode !== null) {
          const logger = LoggerManager.getLogger();
          logger.warn(
            `[Cluster] Worker ${index} exited with code ${exitCode}, restarting...`,
          );
          this.workers[index] = this.spawnReusePortWorker(index);
        }
      });
    }
  }

  // ── proxy mode (Unix socket) ─────────────────────────────────────

  private async startProxy(): Promise<void> {
    const logger = LoggerManager.getLogger();
    logger.info(
      `[Cluster] Starting ${this.workerCount} workers in proxy mode on port ${this.port}`,
    );

    this.socketDir = join(tmpdir(), `bun-cluster-${process.pid}`);
    // Clean up stale directory from a previous run with the same PID
    try { rmSync(this.socketDir, { recursive: true, force: true }); } catch { /* ignore */ }
    mkdirSync(this.socketDir, { recursive: true });

    this.socketPaths = [];
    for (let i = 0; i < this.workerCount; i++) {
      const socketPath = join(this.socketDir, `w${i}.sock`);
      this.socketPaths.push(socketPath);
      this.workers.push(this.spawnProxyWorker(i, socketPath));
    }

    await this.waitForWorkerSockets();
    this.startProxyServer();

    logger.info(
      `[Cluster] ${this.workerCount} workers ready (proxy mode, unix sockets)`,
    );

    this.monitorProxyWorkers();
  }

  private spawnProxyWorker(index: number, socketPath: string): ReturnType<typeof spawn> {
    return spawn({
      cmd: ['bun', 'run', this.scriptPath],
      env: {
        ...process.env,
        PORT: '0',
        REUSE_PORT: '0',
        CLUSTER_WORKER: '1',
        WORKER_ID: String(index),
        CLUSTER_MODE: 'proxy',
        CLUSTER_SOCKET_FILE: socketPath,
        ...(this.hostname ? { HOSTNAME: this.hostname } : {}),
      },
      stdout: 'inherit',
      stderr: 'inherit',
    });
  }

  private async waitForWorkerSockets(): Promise<void> {
    const deadline = Date.now() + 30_000;

    while (Date.now() < deadline) {
      let allReady = true;

      for (const socketPath of this.socketPaths) {
        if (!existsSync(socketPath)) {
          allReady = false;
          break;
        }
      }

      if (allReady) {
        // Give workers a moment to finish bind+listen after file creation
        await Bun.sleep(200);
        return;
      }

      await Bun.sleep(100);
    }

    const ready = this.socketPaths.filter((p) => existsSync(p)).length;
    throw new Error(
      `[Cluster] Not all workers created sockets within 30s (got ${ready}/${this.workerCount})`,
    );
  }

  private startProxyServer(): void {
    const sockets = this.socketPaths;
    const count = sockets.length;

    this.proxyServer = Bun.serve({
      port: this.port,
      hostname: this.hostname,
      fetch: async (req) => {
        const socketPath = sockets[this.roundRobinIndex % count]!;
        this.roundRobinIndex++;

        try {
          return await fetch(req.url, {
            method: req.method,
            headers: req.headers,
            body: req.body,
            redirect: 'manual',
            unix: socketPath,
          });
        } catch {
          return new Response('Bad Gateway', { status: 502 });
        }
      },
    });
  }

  private monitorProxyWorkers(): void {
    for (let i = 0; i < this.workers.length; i++) {
      const index = i;
      this.workers[index]!.exited.then(async (exitCode) => {
        if (exitCode !== 0 && exitCode !== null) {
          const logger = LoggerManager.getLogger();
          logger.warn(
            `[Cluster] Worker ${index} exited with code ${exitCode}, restarting...`,
          );

          const socketPath = this.socketPaths[index]!;
          try { rmSync(socketPath); } catch { /* ignore */ }

          this.workers[index] = this.spawnProxyWorker(index, socketPath);

          const deadline = Date.now() + 15_000;
          while (Date.now() < deadline) {
            if (existsSync(socketPath)) {
              await Bun.sleep(200);
              logger.info(`[Cluster] Worker ${index} restarted (unix socket)`);
              return;
            }
            await Bun.sleep(100);
          }

          logger.error(`[Cluster] Worker ${index} failed to restart within 15s`);
        }
      });
    }
  }

  // ── static helpers ──────────────────────────────────────────────

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

  /**
   * 获取当前 worker 的集群模式
   * @returns 集群模式，非 worker 进程返回 null
   */
  public static getClusterMode(): 'reusePort' | 'proxy' | null {
    if (!ClusterManager.isWorker()) return null;
    return process.env.CLUSTER_MODE === 'proxy' ? 'proxy' : 'reusePort';
  }
}
