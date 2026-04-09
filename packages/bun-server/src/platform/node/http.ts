import { createServer as createHttpServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { IHttpDriver, IServerHandle, HttpServeOptions, IWebSocket, WebSocketHandlers } from '../types';

/**
 * ws.WebSocket 的 IWebSocket 包装
 */
class NodeWebSocket<T> implements IWebSocket<T> {
  private readonly ws: import('ws').WebSocket;
  private _data: T;

  public constructor(ws: import('ws').WebSocket, data: T) {
    this.ws = ws;
    this._data = data;
  }

  public get data(): T {
    return this._data;
  }

  public get readyState(): number {
    return this.ws.readyState;
  }

  public send(data: string | Buffer | Uint8Array): void {
    this.ws.send(data);
  }

  public close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }
}

class NodeServerHandle implements IServerHandle {
  private readonly httpServer: import('node:http').Server;
  private _port: number;
  private _hostname?: string;

  public constructor(
    httpServer: import('node:http').Server,
    port: number,
    hostname?: string,
  ) {
    this.httpServer = httpServer;
    this._port = port;
    this._hostname = hostname;
  }

  public get port(): number {
    return this._port;
  }

  public get hostname(): string | undefined {
    return this._hostname;
  }

  public stop(): void {
    this.httpServer.close();
  }

  public getNative(): unknown {
    return this.httpServer;
  }
}

async function nodeRequestToWebRequest(req: IncomingMessage): Promise<Request> {
  const host = req.headers.host ?? 'localhost';
  const url = `http://${host}${req.url ?? '/'}`;
  const method = req.method ?? 'GET';

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(chunk as Buffer);
  }
  const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }
  }

  return new Request(url, {
    method,
    headers,
    body: body?.length ? body : undefined,
  });
}

function sendWebResponse(res: ServerResponse, webResponse: Response): void {
  res.statusCode = webResponse.status;
  webResponse.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  if (!webResponse.body) {
    res.end();
    return;
  }

  const reader = webResponse.body.getReader();
  const pump = () => {
    reader.read().then(({ done, value }) => {
      if (done) {
        res.end();
        return;
      }
      res.write(value, pump);
    }).catch(() => {
      res.destroy();
    });
  };
  pump();
}

export const nodeHttpAdapter: IHttpDriver = {
  async serve<T>(options: HttpServeOptions<T>): Promise<IServerHandle> {
    // Initialized after listen; the fetch callback only fires after listen completes
    let serverHandle: NodeServerHandle = null!;

    const httpServer = createHttpServer(async (req: IncomingMessage, res: ServerResponse) => {
      try {
        const webRequest = await nodeRequestToWebRequest(req);
        const response = await options.fetch(webRequest, serverHandle);
        if (response) {
          sendWebResponse(res, response);
        } else {
          res.statusCode = 404;
          res.end('Not Found');
        }
      } catch (_err) {
        res.statusCode = 500;
        res.end('Internal Server Error');
      }
    });

    // Mount WebSocket server if handlers provided
    if (options.websocket) {
      setupWebSocket(httpServer, options.websocket);
    }

    const requestedPort = options.port ?? 3000;
    const hostname = options.hostname;

    // Wait for the server to actually start listening so port 0 gets resolved
    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject);
      httpServer.once('listening', resolve);
      if (hostname) {
        httpServer.listen(requestedPort, hostname);
      } else {
        httpServer.listen(requestedPort);
      }
    });

    const addr = httpServer.address() as import('node:net').AddressInfo;
    serverHandle = new NodeServerHandle(httpServer, addr.port, hostname);
    return serverHandle;
  },
};

function setupWebSocket<T>(
  httpServer: import('node:http').Server,
  handlers: WebSocketHandlers<T>,
): void {
  const { WebSocketServer } = require('ws') as typeof import('ws');
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
      const nodeWs = new NodeWebSocket<T>(ws, undefined as unknown as T);

      if (handlers.open) {
        handlers.open(nodeWs);
      }

      ws.on('message', (data) => {
        if (handlers.message) {
          const msg = data instanceof Buffer ? data : Buffer.from(data as ArrayBuffer);
          handlers.message(nodeWs, msg);
        }
      });

      ws.on('close', (code, reason) => {
        if (handlers.close) {
          handlers.close(nodeWs, code, reason.toString());
        }
      });
    });
  });
}
