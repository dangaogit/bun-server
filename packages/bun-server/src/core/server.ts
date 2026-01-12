import type { Server } from "bun";
import { Context } from "./context";
import { LoggerManager } from "@dangao/logsmith";
import type { WebSocketGatewayRegistry } from "../websocket/registry";
import type { WebSocketConnectionData } from "../websocket/registry";

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
}

/**
 * 服务器封装类
 * 基于 Bun.serve() 构建
 */
export class BunServer {
  private server?: Server<WebSocketConnectionData>;
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
  public start(): void {
    if (this.server) {
      throw new Error("Server is already running");
    }

    const logger = LoggerManager.getLogger();

    // 重置状态
    this.activeRequests = 0;
    this.isShuttingDown = false;
    this.shutdownPromise = undefined;
    this.shutdownResolve = undefined;

    this.server = Bun.serve({
      port: this.options.port ?? 3000,
      hostname: this.options.hostname,
      fetch: (
        request: Request,
        server: Server<WebSocketConnectionData>,
      ): Response | Promise<Response> | undefined => {
        // 如果正在关闭，拒绝新请求
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
          // 创建 Context 以便在 WebSocket 处理器中使用
          const context = new Context(request);
          // 创建 Bun 兼容的 URLSearchParams（需要 toJSON 方法）
          const queryParams = new URLSearchParams(url.searchParams);
          const upgraded = server.upgrade(request, {
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

        // 增加活跃请求计数
        this.activeRequests++;

        const context = new Context(request);
        const responsePromise = this.options.fetch(context);

        // 处理响应完成后的清理
        if (responsePromise instanceof Promise) {
          responsePromise
            .finally(() => {
              this.activeRequests--;
              // 如果正在关闭且没有活跃请求，触发关闭完成
              if (this.isShuttingDown && this.activeRequests === 0 && this.shutdownResolve) {
                this.shutdownResolve();
              }
            })
            .catch(() => {
              // 错误已在中间件中处理，这里只负责计数
            });
        } else {
          // 同步响应
          this.activeRequests--;
          if (this.isShuttingDown && this.activeRequests === 0 && this.shutdownResolve) {
            this.shutdownResolve();
          }
        }

        return responsePromise;
      },
      websocket: {
        open: async (ws) => {
          await this.options.websocketRegistry?.handleOpen(ws);
        },
        message: async (ws, message) => {
          await this.options.websocketRegistry?.handleMessage(ws, message);
        },
        close: async (ws, code, reason) => {
          await this.options.websocketRegistry?.handleClose(ws, code, reason);
        },
      },
    });

    const hostname = this.options.hostname ?? "localhost";
    const port = this.options.port ?? 3000;
    logger.info(`Server started at http://${hostname}:${port}`);
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
   * 获取服务器实例
   * @returns Bun Server 实例
   */
  public getServer(): Server<WebSocketConnectionData> | undefined {
    return this.server;
  }

  /**
   * 检查服务器是否运行中
   * @returns 是否运行中
   */
  public isRunning(): boolean {
    return this.server !== undefined;
  }

  /**
   * 获取服务器端口
   */
  public getPort(): number {
    return this.options.port ?? 3000;
  }

  /**
   * 获取服务器主机名
   */
  public getHostname(): string | undefined {
    return this.options.hostname;
  }
}
