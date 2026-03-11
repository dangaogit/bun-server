import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { examplesRegistry, getExampleDomain } from './examples-registry';

interface RunningProcess {
  entryName: string;
  process: ReturnType<typeof spawn>;
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

const server = Bun.serve({
  port: proxyPort,
  reusePort: false,
  fetch(request: Request): Response | Promise<Response> {
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
});

console.log(`[proxy] listening on 0.0.0.0:${server.port}`);
