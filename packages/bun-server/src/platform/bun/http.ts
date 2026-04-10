import type { IHttpDriver, IServerHandle, HttpServeOptions, IWebSocket, WebSocketHandlers } from '../types';

/**
 * Bun ServerWebSocket 的 IWebSocket 包装
 */
export class BunWebSocket<T> implements IWebSocket<T> {
  public constructor(private readonly ws: import('bun').ServerWebSocket<T>) {}

  public get data(): T {
    return this.ws.data;
  }

  public get readyState(): number {
    return this.ws.readyState;
  }

  public send(data: string | Buffer | Uint8Array): void {
    this.ws.send(data as string);
  }

  public close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }

  public getNative(): import('bun').ServerWebSocket<T> {
    return this.ws;
  }
}

class BunServerHandle implements IServerHandle {
  public constructor(private readonly server: import('bun').Server<unknown>) {}

  public get port(): number {
    return this.server.port ?? 0;
  }

  public get hostname(): string | undefined {
    return this.server.hostname ?? undefined;
  }

  public stop(): void {
    this.server.stop();
  }

  public upgrade(request: Request, options?: { data?: unknown }): boolean {
    return this.server.upgrade(request, options as any);
  }

  public timeout(request: Request, seconds: number): void {
    this.server.timeout(request, seconds);
  }

  public getNative(): unknown {
    return this.server;
  }
}

function buildWebSocketHandlers<T>(
  handlers?: WebSocketHandlers<T>,
): import('bun').WebSocketHandler<T> | undefined {
  if (!handlers) return undefined;

  return {
    open: handlers.open
      ? (ws) => handlers.open!(new BunWebSocket(ws) as IWebSocket<T>)
      : undefined,
    message: handlers.message
      ? (ws, msg) => handlers.message!(new BunWebSocket(ws) as IWebSocket<T>, msg as string | Buffer)
      : undefined,
    close: handlers.close
      ? (ws, code, reason) => handlers.close!(new BunWebSocket(ws) as IWebSocket<T>, code, reason)
      : undefined,
  } as import('bun').WebSocketHandler<T>;
}

export const bunHttpAdapter: IHttpDriver = {
  async serve<T>(options: HttpServeOptions<T>): Promise<IServerHandle> {
    const wsHandlers = buildWebSocketHandlers(options.websocket);

    const fetchHandler = (request: Request, bunServer: import('bun').Server<unknown>): Response | Promise<Response | undefined> | undefined => {
      const handle = new BunServerHandle(bunServer);
      return options.fetch(request, handle);
    };

    let server: import('bun').Server<unknown>;

    if (options.unix) {
      server = Bun.serve({
        unix: options.unix,
        fetch: fetchHandler,
        websocket: wsHandlers,
      } as any);
    } else {
      server = Bun.serve({
        port: options.port ?? 3000,
        hostname: options.hostname,
        reusePort: options.reusePort,
        idleTimeout: options.idleTimeout,
        fetch: fetchHandler,
        websocket: wsHandlers,
      } as any);
    }

    return new BunServerHandle(server);
  },
};
