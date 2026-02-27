/**
 * Multi-process (reusePort) benchmark runner.
 *
 * Spawns N worker processes that each bind to the same port via SO_REUSEPORT,
 * then runs the same wrk test suite against the shared port.
 *
 * Linux only -- reusePort is silently ignored on macOS/Windows.
 */

import { $, spawn } from 'bun';
import { resolve } from 'path';

const BENCH_DIR = import.meta.dir;
const WRK_DIR = resolve(BENCH_DIR, 'wrk');
const SERVER_SCRIPT = resolve(BENCH_DIR, 'wrk-server.ts');
const REPORT_PATH = resolve(BENCH_DIR, 'REPORT_CLUSTER.md');

const MIN_FD_LIMIT = 10240;
const COOLDOWN_MS = 1500;
const WARMUP_DURATION = '3s';
const WARMUP_THREADS = 2;
const WARMUP_CONNECTIONS = 10;
const CLUSTER_PORT = 9222;
const DEFAULT_WORKERS = navigator.hardwareConcurrency;

interface TierConfig {
  label: string;
  threads: number;
  connections: number;
  duration: string;
}

const TIERS: TierConfig[] = [
  { label: 'Light',  threads: 2,  connections: 50,  duration: '10s' },
  { label: 'Medium', threads: 4,  connections: 200, duration: '10s' },
  { label: 'Heavy',  threads: 8,  connections: 500, duration: '10s' },
];

interface BenchTarget {
  name: string;
  endpoint: string;
  luaScript?: string;
}

interface WrkResult {
  name: string;
  endpoint: string;
  reqPerSec: string;
  reqPerSecNum: number;
  avgLatency: string;
  latencyStdev: string;
  p99Latency: string;
  transferPerSec: string;
  totalRequests: string;
  errors: string;
}

interface TierResult {
  tier: TierConfig;
  results: WrkResult[];
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
  { name: 'GET /io', endpoint: '/api/io' },
];

function toNumeric(val: string): number {
  const num = parseFloat(val);
  if (Number.isNaN(num)) return 0;
  const lower = val.toLowerCase();
  if (lower.endsWith('k')) return num * 1_000;
  if (lower.endsWith('m')) return num * 1_000_000;
  return num;
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

  const reqPerSecRaw = reqSecLine?.[1] ?? 'N/A';

  return {
    avgLatency: latencyLine?.[1]?.trim() ?? 'N/A',
    latencyStdev: latencyLine?.[2]?.trim() ?? 'N/A',
    p99Latency: p99Match?.[1]?.trim() ?? latencyLine?.[3]?.trim() ?? 'N/A',
    reqPerSec: reqPerSecRaw,
    reqPerSecNum: toNumeric(reqPerSecRaw),
    transferPerSec: transferLine?.[1] ?? 'N/A',
    totalRequests: totalLine?.[1] ? Number(totalLine[1]).toLocaleString() : 'N/A',
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

async function getEnvironmentInfo(): Promise<{
  os: string;
  bunVersion: string;
  cpuModel: string;
  cores: string;
}> {
  const os = `${process.platform} ${process.arch}`;
  const bunVersion = Bun.version;

  let cpuModel = 'unknown';
  let cores = 'unknown';
  try {
    if (process.platform === 'darwin') {
      cpuModel = (await $`sysctl -n machdep.cpu.brand_string`.text()).trim();
      const pCores = (await $`sysctl -n hw.perflevel0.physicalcpu`.text()).trim();
      const eCores = (await $`sysctl -n hw.perflevel1.physicalcpu`.text()).trim();
      cores = `${pCores}P + ${eCores}E`;
    } else if (process.platform === 'linux') {
      cpuModel = (await $`grep -m1 'model name' /proc/cpuinfo`.text()).replace('model name\t:', '').trim();
      cores = (await $`nproc`.text()).trim();
    }
  } catch {
    // fallback
  }

  return { os, bunVersion, cpuModel, cores };
}

function shellWithFd(cmd: string): string[] {
  return ['sh', '-c', `ulimit -n ${MIN_FD_LIMIT} 2>/dev/null; ${cmd}`];
}

async function warmup(baseUrl: string): Promise<void> {
  console.log(`[cluster] warming up (${WARMUP_DURATION}, JIT compile)...`);
  for (const target of TARGETS) {
    let wrkCmd = `wrk -t${WARMUP_THREADS} -c${WARMUP_CONNECTIONS} -d${WARMUP_DURATION}`;
    if (target.luaScript) {
      wrkCmd += ` -s '${resolve(WRK_DIR, target.luaScript)}'`;
    }
    wrkCmd += ` '${baseUrl}${target.endpoint}'`;

    const proc = Bun.spawn(shellWithFd(wrkCmd), { stdout: 'pipe', stderr: 'pipe' });
    await proc.exited;
  }
  console.log('[cluster] warmup complete');
}

async function runWrk(baseUrl: string, target: BenchTarget, tier: TierConfig): Promise<WrkResult> {
  const url = `${baseUrl}${target.endpoint}`;
  let wrkCmd = `wrk -t${tier.threads} -c${tier.connections} -d${tier.duration} --latency`;

  if (target.luaScript) {
    wrkCmd += ` -s '${resolve(WRK_DIR, target.luaScript)}'`;
  }

  wrkCmd += ` '${url}'`;

  const proc = Bun.spawn(shellWithFd(wrkCmd), { stdout: 'pipe', stderr: 'pipe' });
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;

  const parsed = parseWrkOutput(stdout);
  return { name: target.name, endpoint: target.endpoint, ...parsed };
}

function generateReport(
  tierResults: TierResult[],
  env: { os: string; bunVersion: string; cpuModel: string; cores: string },
  workerCount: number,
): string {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const lines: string[] = [
    '# HTTP Benchmark Report (Cluster / reusePort)',
    '',
    `> Generated: ${now}`,
    `> CPU: ${env.cpuModel} (${env.cores} cores)`,
    `> OS: ${env.os} | Bun ${env.bunVersion} | @dangao/bun-server 1.9.0`,
    `> Workers: ${workerCount} (reusePort: true)`,
    `> NOTE: reusePort only effective on Linux`,
    '',
  ];

  for (const { tier, results } of tierResults) {
    lines.push(
      `## ${tier.label} (-t${tier.threads} -c${tier.connections} -d${tier.duration})`,
      '',
      '| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |',
      '|----------|---------|-------------|-------|-------------|--------------|------------|--------|',
    );

    for (const r of results) {
      lines.push(
        `| ${r.name} | ${r.reqPerSec} | ${r.avgLatency} | ${r.latencyStdev} | ${r.p99Latency} | ${r.transferPerSec} | ${r.totalRequests} | ${r.errors} |`,
      );
    }

    lines.push('');
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  if (process.platform !== 'linux') {
    console.warn('[cluster] WARNING: reusePort only works on Linux.');
    console.warn('[cluster] On macOS/Windows, all workers except the first will fail to bind.');
    console.warn('[cluster] Proceeding anyway for testing purposes...\n');
  }

  console.log('[cluster] checking wrk...');
  try {
    const which = await $`which wrk`.quiet().text();
    if (!which.trim()) throw new Error('not found');
  } catch {
    console.error('[cluster] wrk is not installed. Install via: brew install wrk');
    process.exit(1);
  }

  const workerCount = Number(process.env.WORKERS ?? DEFAULT_WORKERS);
  const port = CLUSTER_PORT;

  console.log(`[cluster] starting ${workerCount} workers on port ${port} (reusePort)...`);

  const workers: ReturnType<typeof spawn>[] = [];
  for (let i = 0; i < workerCount; i++) {
    workers.push(
      spawn({
        cmd: shellWithFd(`exec bun run '${SERVER_SCRIPT}'`),
        stdout: 'pipe',
        stderr: 'inherit',
        env: { ...process.env, PORT: String(port), REUSE_PORT: '1' },
      }),
    );
  }

  // Wait for WRK_READY from the first worker, then probe the port
  const firstReader = workers[0].stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await firstReader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    if (buffer.includes('WRK_READY:')) break;
  }
  firstReader.releaseLock();

  // Give remaining workers time to bind
  await Bun.sleep(1000);

  console.log(`[cluster] ${workerCount} workers started`);
  await waitForServer(port);

  const baseUrl = `http://127.0.0.1:${port}`;

  await warmup(baseUrl);

  const env = await getEnvironmentInfo();
  const tierResults: TierResult[] = [];

  for (const tier of TIERS) {
    console.log(`\n[cluster] === ${tier.label} tier: -t${tier.threads} -c${tier.connections} -d${tier.duration} ===`);
    const results: WrkResult[] = [];

    for (const target of TARGETS) {
      await Bun.sleep(COOLDOWN_MS);
      console.log(`[cluster]   ${target.name} ...`);
      const result = await runWrk(baseUrl, target, tier);
      results.push(result);
      console.log(`    -> ${result.reqPerSec} req/s, avg ${result.avgLatency} (±${result.latencyStdev}), p99 ${result.p99Latency}, errors ${result.errors}`);
    }

    tierResults.push({ tier, results });
  }

  for (const w of workers) {
    w.kill('SIGTERM');
  }
  const killTimeout = setTimeout(() => {
    for (const w of workers) w.kill('SIGKILL');
  }, 5_000);
  await Promise.all(workers.map((w) => w.exited));
  clearTimeout(killTimeout);

  const report = generateReport(tierResults, env, workerCount);
  console.log('\n' + report);

  await Bun.write(REPORT_PATH, report);
  console.log(`[cluster] report saved to ${REPORT_PATH}`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('[cluster] fatal error:', err);
    process.exit(1);
  });
}
