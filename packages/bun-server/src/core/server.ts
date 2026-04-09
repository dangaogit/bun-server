import { Context } from "./context";
import { LoggerManager } from "@dangao/logsmith";
import type { WebSocketGatewayRegistry } from "../websocket/registry";
import type { WebSocketConnectionData } from "../websocket/registry";
import type { IServerHandle, IWebSocket } from "../platform/types";
import { getRuntime } from "../platform/runtime";

/**
 * 服务器配置选项
 */
export interface ServerOptions {
  /**
   * 端口号
   */
  port?: number;

  /**
   * 主机名
   */
  hostname?: string;

  /**
   * 请求处理函数
   */
  fetch: (context: Context) => Response | Promise<Response>;

  /**
   * WebSocket 网关注册表
   */
  websocketRegistry?: WebSocketGatewayRegistry;

  /**
   * 优雅停机超时时间（毫秒）
   * 默认 30 秒
   */
  gracefulShutdownTimeout?: number;

  /**
   * 是否启用 SO_REUSEPORT
   * 允许多进程绑定同一端口，用于多进程负载均衡
   * 仅 Linux 有效，macOS/Windows 会忽略
   * @default false
   */
  reusePort?: boolean;

  /**
   * 连接空闲超时时间（毫秒）
   * Bun 平台下自动转换为秒单位；Node.js 平台下静默忽略
   */
  idleTimeout?: number;

  /**
   * SSE 保活配置
   * @see ApplicationOptions.sseKeepAlive
   */
  sseKeepAlive?: {
    enabled?: boolean;
    intervalMs?: number;
  };
}

/**
 * 服务器封装类
 * 基于平台适配层构建，支持 Bun 和 Node.js
 */
export class BunServer {
  private server?: IServerHandle;
  private readonly options: ServerOptions;
  private activeRequests: number = 0;
  private isShuttingDown: boolean = false;
  private shutdownPromise?: Promise<void>;
  private shutdownResolve?: () => void;

  public constructor(options: ServerOptions) {
    this.options = options;
  }

  /**
   * 启动服务器
   */
  public async start(): Promise<void> {
    if (this.server) {
      throw new Error("Server is already running");
    }

    const logger = LoggerManager.getLogger();

    // 重置状态
    this.activeRequests = 0;
    this.isShuttingDown = false;
    this.shutdownPromise = undefined;
    this.shutdownResolve = undefined;

    const sseKeepAlive = this.options.sseKeepAlive;
    const sseHeartbeatEnabled = sseKeepAlive?.enabled !== false;
    const sseHeartbeatIntervalMs = sseKeepAlive?.intervalMs ?? 15_000;

    const postProcessSse = (
      response: Response,
      request: Request,
      serverHandle: IServerHandle,
    ): Response => {
      const ct = response.headers.get('content-type');
      if (!ct?.includes('text/event-stream')) {
        return response;
      }

      // SSE detected — disable idle timeout for this connection (Bun-only, no-op on Node)
      serverHandle.timeout?.(request, 0);

      if (sseHeartbeatEnabled && response.body) {
        return BunServer.wrapSseWithHeartbeat(
          response,
          sseHeartbeatIntervalMs,
          request.signal,
        );
      }

      return response;
    };

    const decrementAndMaybeShutdown = () => {
      this.activeRequests--;
      if (this.isShuttingDown && this.activeRequests === 0 && this.shutdownResolve) {
        this.shutdownResolve();
      }
    };

    const fetchHandler = (
      request: Request,
      serverHandle: IServerHandle,
    ): Response | Promise<Response | undefined> | undefined => {
      if (this.isShuttingDown) {
        return new Response("Server is shutting down", { status: 503 });
      }

      const upgradeHeader = request.headers.get("upgrade");
      if (
        this.options.websocketRegistry &&
        upgradeHeader &&
        upgradeHeader.toLowerCase() === "websocket"
      ) {
        const url = new URL(request.url);
        if (!this.options.websocketRegistry.hasGateway(url.pathname)) {
          return new Response("WebSocket gateway not found", { status: 404 });
        }
        const context = new Context(request);
        const queryParams = new URLSearchParams(url.searchParams);
        const upgraded = serverHandle.upgrade?.(request, {
          data: {
            path: url.pathname,
            query: queryParams,
            context,
          },
        });
        if (upgraded) {
          return undefined;
        }
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      this.activeRequests++;

      const context = new Context(request);
      const responsePromise = this.options.fetch(context);

      if (responsePromise instanceof Promise) {
        const processed = responsePromise.then(
          (response) => postProcessSse(response, request, serverHandle),
        );
        processed
          .finally(decrementAndMaybeShutdown)
          .catch(() => { /* errors handled by middleware pipeline */ });
        return processed;
      }

      decrementAndMaybeShutdown();
      return postProcessSse(responsePromise, request, serverHandle);
    };

    const websocketHandlers = this.options.websocketRegistry
      ? {
          open: async (ws: IWebSocket<WebSocketConnectionData>) => {
            await this.options.websocketRegistry?.handleOpen(ws);
          },
          message: async (ws: IWebSocket<WebSocketConnectionData>, message: string | Buffer) => {
            await this.options.websocketRegistry?.handleMessage(ws, message);
          },
          close: async (ws: IWebSocket<WebSocketConnectionData>, code: number, reason: string) => {
            await this.options.websocketRegistry?.handleClose(ws, code, reason);
          },
        }
      : undefined;

    const runtime = getRuntime();
    const socketFile = process.env.CLUSTER_SOCKET_FILE;

    if (socketFile) {
      // Unix socket mode for cluster proxy workers
      this.server = await runtime.http.serve({
        unix: socketFile,
        fetch: fetchHandler,
        websocket: websocketHandlers,
      });
      logger.info(`Server started at unix://${socketFile}`);
    } else {
      const idleTimeoutSec =
        typeof this.options.idleTimeout === 'number'
          ? Math.max(0, Math.ceil(this.options.idleTimeout / 1000))
          : undefined;

      this.server = await runtime.http.serve({
        port: this.options.port ?? 3000,
        hostname: this.options.hostname,
        reusePort: this.options.reusePort,
        idleTimeout: idleTimeoutSec,
        fetch: fetchHandler,
        websocket: websocketHandlers,
      });
      const hostname = this.options.hostname ?? "localhost";
      const port = this.server.port;
      logger.info(`Server started at http://${hostname}:${port}`);

      // In proxy cluster mode (TCP fallback), report port to master
      const portFile = process.env.CLUSTER_PORT_FILE;
      if (portFile) {
        runtime.fs.write(portFile, String(port));
      }
    }
  }

  /**
   * 停止服务器（立即停止，不等待请求完成）
   */
  public stop(): void {
    if (this.server) {
      const logger = LoggerManager.getLogger();
      this.server.stop();
      this.server = undefined;
      this.isShuttingDown = false;
      this.activeRequests = 0;
      logger.info("Server stopped");
    }
  }

  /**
   * 优雅停机
   * 停止接受新请求，等待正在处理的请求完成
   * @param timeout - 超时时间（毫秒），默认使用配置的 gracefulShutdownTimeout 或 30000
   * @returns Promise，在停机完成时 resolve
   */
  public async gracefulShutdown(timeout?: number): Promise<void> {
    if (!this.server || this.isShuttingDown) {
      return;
    }

    const logger = LoggerManager.getLogger();
    const shutdownTimeout = timeout ?? this.options.gracefulShutdownTimeout ?? 30000;

    logger.info(`Starting graceful shutdown (timeout: ${shutdownTimeout}ms, active requests: ${this.activeRequests})`);

    // 标记为正在关闭，停止接受新请求
    this.isShuttingDown = true;

    // 如果没有活跃请求，立即关闭
    if (this.activeRequests === 0) {
      this.stop();
      logger.info("Graceful shutdown completed (no active requests)");
      return;
    }

    // 创建关闭 Promise
    if (!this.shutdownPromise) {
      this.shutdownPromise = new Promise<void>((resolve) => {
        this.shutdownResolve = resolve;
      });
    }

    // 设置超时
    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        logger.warn(`Graceful shutdown timeout (${shutdownTimeout}ms), forcing shutdown`);
        resolve();
      }, shutdownTimeout);
    });

    // 等待所有请求完成或超时
    await Promise.race([this.shutdownPromise, timeoutPromise]);

    // 停止服务器
    this.stop();
    logger.info(`Graceful shutdown completed (remaining active requests: ${this.activeRequests})`);
  }

  /**
   * 获取当前活跃请求数
   */
  public getActiveRequests(): number {
    return this.activeRequests;
  }

  /**
   * 检查是否正在关闭
   */
  public isShuttingDownState(): boolean {
    return this.isShuttingDown;
  }

  /**
   * 获取平台中立的服务器句柄（推荐）
   */
  public getServer(): IServerHandle | undefined {
    return this.server;
  }

  /**
   * 获取底层原生服务器实例（不推荐，类型为 unknown）
   * - Bun 平台：Bun.Server<WebSocketConnectionData>
   * - Node.js 平台：node:http.Server
   */
  public getNativeServer(): unknown {
    return this.server?.getNative();
  }

  /**
   * 检查服务器是否运行中
   */
  public isRunning(): boolean {
    return this.server !== undefined;
  }

  /**
   * 获取服务器端口
   * 如果服务器正在运行，返回实际绑定的端口（支持 port:0 场景）
   */
  public getPort(): number {
    if (this.server) {
      return this.server.port ?? this.options.port ?? 3000;
    }
    return this.options.port ?? 3000;
  }

  /**
   * 获取服务器主机名
   */
  public getHostname(): string | undefined {
    return this.options.hostname;
  }

  /**
   * 将 SSE Response 的 body 包裹一层心跳注入流。
   *
   * 原始流的数据原样透传；在数据间隙中按 intervalMs 发送
   * SSE 注释帧 `: keepalive\n\n`（客户端会忽略注释帧）。
   *
   * 当 signal abort / 原始流结束 / 客户端断连时自动清理定时器。
   */
  private static wrapSseWithHeartbeat(
    original: Response,
    intervalMs: number,
    signal: AbortSignal,
  ): Response {
    const encoder = new TextEncoder();
    const keepaliveChunk = encoder.encode(': keepalive\n\n');
    const originalBody = original.body!;
    let heartbeat: ReturnType<typeof setInterval> | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    const wrapped = new ReadableStream<Uint8Array>({
      start(controller) {
        reader = originalBody.getReader() as ReadableStreamDefaultReader<Uint8Array>;

        heartbeat = setInterval(() => {
          try {
            controller.enqueue(keepaliveChunk);
          } catch {
            clearInterval(heartbeat);
            heartbeat = undefined;
          }
        }, intervalMs);

        const onAbort = () => {
          if (heartbeat) { clearInterval(heartbeat); heartbeat = undefined; }
        };
        signal.addEventListener('abort', onAbort, { once: true });

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await reader!.read();
              if (done) break;
              controller.enqueue(value);
            }
            controller.close();
          } catch (err) {
            try { controller.error(err); } catch { /* already closed */ }
          } finally {
            if (heartbeat) { clearInterval(heartbeat); heartbeat = undefined; }
            signal.removeEventListener('abort', onAbort);
          }
        };
        pump();
      },
      cancel() {
        if (heartbeat) { clearInterval(heartbeat); heartbeat = undefined; }
        reader?.cancel();
      },
    });

    return new Response(wrapped, {
      status: original.status,
      headers: original.headers,
    });
  }
}
