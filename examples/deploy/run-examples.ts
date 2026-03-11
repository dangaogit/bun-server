import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { examplesRegistry, getExampleDomain } from './examples-registry';

interface RunningProcess {
  entryName: string;
  process: ReturnType<typeof spawn>;
}

type ProxyMessage = string | ArrayBuffer | Uint8Array | Buffer;

interface ProxyWebSocketData {
  targetUrl: string;
  backendSocket: WebSocket | null;
  pendingMessages: ProxyMessage[];
}

const examplesRoot = fileURLToPath(new URL('..', import.meta.url));
const proxyPort = Number(process.env.EXAMPLES_PROXY_PORT ?? 8080);
const enabledEntries = examplesRegistry.filter((item) => item.enabled);
const exposedEntries = enabledEntries.filter((item) => item.exposed);
const hostToEntry = new Map(
  exposedEntries.map((item) => [getExampleDomain(item.slug), item]),
);
const runningProcesses: RunningProcess[] = [];
let shuttingDown = false;

function pipeChildOutput(
  child: ReturnType<typeof spawn>,
  entryName: string,
): void {
  child.stdout?.on('data', (chunk: Buffer) => {
    process.stdout.write(`[${entryName}] ${chunk.toString()}`);
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    process.stderr.write(`[${entryName}] ${chunk.toString()}`);
  });
}

function buildChildEnv(scriptName: string, port: number): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(port),
  };

  if (scriptName === 'start:ai-platform-mvp:web') {
    const apiEntry = enabledEntries.find((item) => item.scriptName === 'start:ai-platform-mvp:api');
    const apiPort = apiEntry?.port ?? 3500;
    env.WEB_PORT = String(port);
    env.VITE_PROXY_TARGET = `http://127.0.0.1:${apiPort}`;
  }

  return env;
}

function getCommand(scriptName: string, port: number): string[] {
  if (scriptName === 'start:ai-platform-mvp:web') {
    return [
      'run',
      '--cwd',
      '05-ai/ai-platform-mvp/web',
      'vite',
      'preview',
      '--host',
      '0.0.0.0',
      '--port',
      String(port),
      '--strictPort',
    ];
  }
  return ['run', scriptName];
}

function startExample(scriptName: string, port: number): ReturnType<typeof spawn> {
  const child = spawn('bun', getCommand(scriptName, port), {
    cwd: examplesRoot,
    env: buildChildEnv(scriptName, port),
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  pipeChildOutput(child, scriptName);

  return child;
}

async function shutdown(exitCode: number): Promise<void> {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  for (const running of runningProcesses) {
    if (!running.process.killed) {
      running.process.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(exitCode), 1000);
}

for (const entry of enabledEntries) {
  const child = startExample(entry.scriptName, entry.port);
  runningProcesses.push({ entryName: entry.scriptName, process: child });
}

setInterval(() => {
  if (shuttingDown) {
    return;
  }
  for (const running of runningProcesses) {
    if (running.process.exitCode !== null) {
      console.error(`[runner] ${running.entryName} exited unexpectedly (code=${running.process.exitCode})`);
      void shutdown(1);
      return;
    }
  }
}, 1000);

console.log(`[runner] started ${enabledEntries.length} examples`);
for (const entry of exposedEntries) {
  console.log(`[runner] ${getExampleDomain(entry.slug)} -> 127.0.0.1:${entry.port}`);
}

process.on('SIGINT', () => void shutdown(0));
process.on('SIGTERM', () => void shutdown(0));

function normalizeMessageData(data: ProxyMessage | Blob): Promise<ProxyMessage> | ProxyMessage {
  if (data instanceof Blob) {
    return data.arrayBuffer();
  }
  return data;
}

function forwardData(
  source: ProxyMessage | Blob,
  target: WebSocket | Bun.ServerWebSocket<ProxyWebSocketData>,
): void {
  const normalized = normalizeMessageData(source);
  if (normalized instanceof Promise) {
    void normalized.then((payload) => target.send(payload));
    return;
  }
  target.send(normalized);
}

const server = Bun.serve<ProxyWebSocketData>({
  port: proxyPort,
  reusePort: false,
  fetch(
    request: Request,
    currentServer: Bun.Server<ProxyWebSocketData>,
  ) {
    const requestHost = new URL(request.url).host;
    const host = requestHost.split(':')[0] ?? requestHost;
    const mappedEntry = hostToEntry.get(host);

    if (!mappedEntry) {
      return Response.json(
        {
          message: 'Unknown examples host',
          host,
          available: exposedEntries.map((item) => ({
            domain: getExampleDomain(item.slug),
            scriptName: item.scriptName,
          })),
        },
        { status: 404 },
      );
    }

    const websocketTargetUrl = new URL(request.url);
    websocketTargetUrl.protocol = 'ws:';
    websocketTargetUrl.hostname = '127.0.0.1';
    websocketTargetUrl.port = String(mappedEntry.port);
    const upgraded = currentServer.upgrade(request, {
      data: {
        targetUrl: websocketTargetUrl.toString(),
        backendSocket: null,
        pendingMessages: [],
      } satisfies ProxyWebSocketData,
    });
    if (upgraded) {
      return;
    }

    const targetUrl = new URL(request.url);
    targetUrl.protocol = 'http:';
    targetUrl.hostname = '127.0.0.1';
    targetUrl.port = String(mappedEntry.port);

    const headers = new Headers(request.headers);
    headers.set('x-forwarded-host', host);
    headers.set('x-forwarded-proto', 'https');
    headers.set('x-forwarded-port', '443');

    const init: RequestInit = {
      method: request.method,
      headers,
      redirect: 'manual',
    };

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
    }

    const proxyRequest = new Request(targetUrl.toString(), init);
    return fetch(proxyRequest);
  },
  websocket: {
    open(clientSocket: Bun.ServerWebSocket<ProxyWebSocketData>): void {
      const data = clientSocket.data;
      const backendSocket = new WebSocket(data.targetUrl);
      data.backendSocket = backendSocket;

      backendSocket.onopen = () => {
        for (const pendingMessage of data.pendingMessages) {
          backendSocket.send(pendingMessage);
        }
        data.pendingMessages.length = 0;
      };

      backendSocket.onmessage = (event: MessageEvent<string | ArrayBuffer | Blob>) => {
        forwardData(event.data, clientSocket);
      };

      backendSocket.onerror = () => {
        if (clientSocket.readyState === 1) {
          clientSocket.close(1011, 'Upstream websocket proxy error');
        }
      };

      backendSocket.onclose = (event: CloseEvent) => {
        if (clientSocket.readyState === 1) {
          clientSocket.close(event.code || 1000, event.reason || 'Upstream closed');
        }
      };
    },
    message(
      clientSocket: Bun.ServerWebSocket<ProxyWebSocketData>,
      message: string | Buffer,
    ): void {
      const data = clientSocket.data;
      const backendSocket = data.backendSocket;
      if (!backendSocket) {
        data.pendingMessages.push(message);
        return;
      }

      if (backendSocket.readyState === WebSocket.OPEN) {
        backendSocket.send(message);
        return;
      }

      if (backendSocket.readyState === WebSocket.CONNECTING) {
        data.pendingMessages.push(message);
      }
    },
    close(
      clientSocket: Bun.ServerWebSocket<ProxyWebSocketData>,
      code: number,
      reason: string,
    ): void {
      const backendSocket = clientSocket.data.backendSocket;
      if (!backendSocket) {
        return;
      }

      if (backendSocket.readyState === WebSocket.OPEN || backendSocket.readyState === WebSocket.CONNECTING) {
        backendSocket.close(code, reason);
      }
    },
  },
});

console.log(`[proxy] listening on 0.0.0.0:${server.port}`);
