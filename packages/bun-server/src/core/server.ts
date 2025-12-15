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
}

/**
 * 服务器封装类
 * 基于 Bun.serve() 构建
 */
export class BunServer {
  private server?: Server<WebSocketConnectionData>;
  private readonly options: ServerOptions;

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

    this.server = Bun.serve({
      port: this.options.port ?? 3000,
      hostname: this.options.hostname,
      fetch: (
        request: Request,
        server: Server<WebSocketConnectionData>,
      ): Response | Promise<Response> | undefined => {
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
          const upgraded = server.upgrade(request, {
            data: { path: url.pathname },
          });
          if (upgraded) {
            return undefined;
          }
          return new Response("WebSocket upgrade failed", { status: 400 });
        }

        const context = new Context(request);
        return this.options.fetch(context);
      },
      websocket: {
        open: (ws) => {
          this.options.websocketRegistry?.handleOpen(ws);
        },
        message: (ws, message) => {
          this.options.websocketRegistry?.handleMessage(ws, message);
        },
        close: (ws, code, reason) => {
          this.options.websocketRegistry?.handleClose(ws, code, reason);
        },
      },
    });

    const hostname = this.options.hostname ?? "localhost";
    const port = this.options.port ?? 3000;
    logger.info(`Server started at http://${hostname}:${port}`);
  }

  /**
   * 停止服务器
   */
  public stop(): void {
    if (this.server) {
      const logger = LoggerManager.getLogger();
      this.server.stop();
      this.server = undefined;
      logger.info("Server stopped");
    }
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
