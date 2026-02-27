import { $ } from 'bun';
import { resolve, dirname } from 'path';

const BENCH_DIR = dirname(new URL(import.meta.url).pathname);
const WRK_DIR = resolve(BENCH_DIR, 'wrk');
const SERVER_SCRIPT = resolve(BENCH_DIR, 'wrk-server.ts');
const REPORT_PATH = resolve(BENCH_DIR, 'REPORT.md');

const WRK_THREADS = 2;
const WRK_CONNECTIONS = 50;
const WRK_DURATION = '10s';

interface BenchTarget {
  name: string;
  endpoint: string;
  luaScript?: string;
}

interface WrkResult {
  name: string;
  endpoint: string;
  reqPerSec: string;
  avgLatency: string;
  p99Latency: string;
  transferPerSec: string;
  totalRequests: string;
  errors: string;
}

const TARGETS: BenchTarget[] = [
  { name: 'GET /ping', endpoint: '/api/ping' },
  { name: 'GET /json', endpoint: '/api/json' },
  { name: 'GET /users/:id', endpoint: '/api/users/42' },
  { name: 'GET /search?q=', endpoint: '/api/search?q=hello' },
  { name: 'POST /users', endpoint: '/api/users', luaScript: 'post-json.lua' },
  { name: 'POST /users/validated', endpoint: '/api/users/validated', luaScript: 'post-validate.lua' },
  { name: 'GET /middleware', endpoint: '/api/middleware' },
  { name: 'GET /headers', endpoint: '/api/headers' },
];

function parseLatency(raw: string): string {
  return raw.trim();
}

function parseWrkOutput(stdout: string): Omit<WrkResult, 'name' | 'endpoint'> {
  const latencyLine = stdout.match(/Latency\s+([\d.]+\w+)\s+([\d.]+\w+)\s+([\d.]+\w+)/);
  const reqSecLine = stdout.match(/Req\/Sec\s+([\d.]+\w*)\s+([\d.]+\w*)\s+([\d.]+\w*)/);
  const totalLine = stdout.match(/([\d]+)\s+requests in/);
  const transferLine = stdout.match(/Transfer\/sec:\s+([\d.]+\w+)/);

  const p99Match = stdout.match(/99%\s+([\d.]+\w+)/);

  const errorsMatch = stdout.match(/Socket errors:.*?(\d+)\s+connect.*?(\d+)\s+read.*?(\d+)\s+write.*?(\d+)\s+timeout/);
  const nonTwoHundredMatch = stdout.match(/Non-2xx or 3xx responses:\s+(\d+)/);

  let errorCount = 0;
  if (errorsMatch) {
    errorCount += Number(errorsMatch[1]) + Number(errorsMatch[2]) + Number(errorsMatch[3]) + Number(errorsMatch[4]);
  }
  if (nonTwoHundredMatch) {
    errorCount += Number(nonTwoHundredMatch[1]);
  }

  return {
    avgLatency: latencyLine ? parseLatency(latencyLine[1]) : 'N/A',
    p99Latency: p99Match ? parseLatency(p99Match[1]) : (latencyLine ? parseLatency(latencyLine[3]) : 'N/A'),
    reqPerSec: reqSecLine ? reqSecLine[1] : 'N/A',
    transferPerSec: transferLine ? transferLine[1] : 'N/A',
    totalRequests: totalLine ? Number(totalLine[1]).toLocaleString() : 'N/A',
    errors: errorCount > 0 ? String(errorCount) : '0',
  };
}

async function waitForServer(port: number, timeoutMs: number = 15_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/api/ping`);
      if (resp.ok) return;
    } catch {
      // not ready
    }
    await Bun.sleep(200);
  }
  throw new Error(`Server did not become ready within ${timeoutMs}ms`);
}

async function getEnvironmentInfo(): Promise<{ os: string; bunVersion: string; cpuModel: string }> {
  const os = `${process.platform} ${process.arch}`;
  const bunVersion = Bun.version;

  let cpuModel = 'unknown';
  try {
    if (process.platform === 'darwin') {
      const result = await $`sysctl -n machdep.cpu.brand_string`.text();
      cpuModel = result.trim();
    } else if (process.platform === 'linux') {
      const result = await $`grep -m1 'model name' /proc/cpuinfo`.text();
      cpuModel = result.replace('model name\t:', '').trim();
    }
  } catch {
    // fallback
  }

  return { os, bunVersion, cpuModel };
}

async function runWrk(baseUrl: string, target: BenchTarget): Promise<WrkResult> {
  const url = `${baseUrl}${target.endpoint}`;
  const args = [
    'wrk',
    `-t${WRK_THREADS}`,
    `-c${WRK_CONNECTIONS}`,
    `-d${WRK_DURATION}`,
    '--latency',
  ];

  if (target.luaScript) {
    args.push('-s', resolve(WRK_DIR, target.luaScript));
  }

  args.push(url);

  const proc = Bun.spawn(args, { stdout: 'pipe', stderr: 'pipe' });
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;

  const parsed = parseWrkOutput(stdout);
  return { name: target.name, endpoint: target.endpoint, ...parsed };
}

function generateReport(results: WrkResult[], env: { os: string; bunVersion: string; cpuModel: string }): string {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const lines: string[] = [
    '# HTTP Benchmark Report',
    '',
    `> Generated: ${now}`,
    `> CPU: ${env.cpuModel}`,
    `> OS: ${env.os} | Bun ${env.bunVersion} | @dangao/bun-server 1.9.0`,
    `> wrk params: -t${WRK_THREADS} -c${WRK_CONNECTIONS} -d${WRK_DURATION}`,
    '',
    '| Endpoint | Req/Sec | Avg Latency | P99 Latency | Transfer/sec | Total Reqs | Errors |',
    '|----------|---------|-------------|-------------|--------------|------------|--------|',
  ];

  for (const r of results) {
    lines.push(
      `| ${r.name} | ${r.reqPerSec} | ${r.avgLatency} | ${r.p99Latency} | ${r.transferPerSec} | ${r.totalRequests} | ${r.errors} |`,
    );
  }

  lines.push('');
  return lines.join('\n');
}

async function main(): Promise<void> {
  console.log('[run-wrk] checking wrk...');
  try {
    const which = await $`which wrk`.quiet().text();
    if (!which.trim()) throw new Error('not found');
  } catch {
    console.error('[run-wrk] wrk is not installed. Install via: brew install wrk');
    process.exit(1);
  }

  console.log('[run-wrk] starting benchmark server...');
  const serverProc = Bun.spawn(['bun', 'run', SERVER_SCRIPT], {
    stdout: 'pipe',
    stderr: 'inherit',
    env: { ...process.env, PORT: '0' },
  });

  let port: number | null = null;
  const reader = serverProc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const match = buffer.match(/WRK_READY:(\d+)/);
    if (match) {
      port = Number(match[1]);
      break;
    }
  }
  reader.releaseLock();

  if (!port) {
    console.error('[run-wrk] failed to detect server port');
    serverProc.kill();
    process.exit(1);
  }

  console.log(`[run-wrk] server ready on port ${port}`);
  await waitForServer(port);

  const env = await getEnvironmentInfo();
  const baseUrl = `http://127.0.0.1:${port}`;
  const results: WrkResult[] = [];

  for (const target of TARGETS) {
    console.log(`[run-wrk] benchmarking ${target.name} ...`);
    const result = await runWrk(baseUrl, target);
    results.push(result);
    console.log(`  -> ${result.reqPerSec} req/s, avg ${result.avgLatency}, p99 ${result.p99Latency}`);
  }

  serverProc.kill();

  const report = generateReport(results, env);
  console.log('\n' + report);

  await Bun.write(REPORT_PATH, report);
  console.log(`[run-wrk] report saved to ${REPORT_PATH}`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('[run-wrk] fatal error:', err);
    process.exit(1);
  });
}
