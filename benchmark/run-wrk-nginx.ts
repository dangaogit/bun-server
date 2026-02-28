/**
 * nginx + Docker Compose benchmark runner.
 *
 * Dynamically generates nginx.conf and docker-compose.yml, spins up
 * N Bun worker containers behind an nginx reverse-proxy, then runs
 * the standard wrk test suite against the nginx endpoint.
 *
 * Prerequisites: docker, docker compose, wrk
 *
 * Usage:
 *   bun benchmark/run-wrk-nginx.ts
 *   WORKERS=4 bun benchmark/run-wrk-nginx.ts
 */

import { $ } from 'bun';
import { resolve, join } from 'path';
import { mkdirSync, writeFileSync, rmSync } from 'fs';

const BENCH_DIR = import.meta.dir;
const WRK_DIR = resolve(BENCH_DIR, 'wrk');
const DOCKER_DIR = resolve(BENCH_DIR, 'docker');
const PROJECT_ROOT = resolve(BENCH_DIR, '..');
const REPORT_PATH = resolve(BENCH_DIR, 'REPORT_NGINX.md');

const COMPOSE_FILE = join(DOCKER_DIR, 'docker-compose.yml');
const NGINX_CONF = join(DOCKER_DIR, 'nginx.conf');
const COMPOSE_PROJECT = 'bun-bench';

const MIN_FD_LIMIT = 10240;
const COOLDOWN_MS = 1500;
const WARMUP_DURATION = '3s';
const WARMUP_THREADS = 2;
const WARMUP_CONNECTIONS = 10;
const NGINX_PORT = 9444;
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

// ── wrk helpers (same as other runners) ────────────────────────────

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

function shellWithFd(cmd: string): string[] {
  return ['sh', '-c', `ulimit -n ${MIN_FD_LIMIT} 2>/dev/null; ${cmd}`];
}

async function warmup(baseUrl: string): Promise<void> {
  console.log(`[nginx] warming up (${WARMUP_DURATION}, JIT compile)...`);
  for (const target of TARGETS) {
    let wrkCmd = `wrk -t${WARMUP_THREADS} -c${WARMUP_CONNECTIONS} -d${WARMUP_DURATION}`;
    if (target.luaScript) {
      wrkCmd += ` -s '${resolve(WRK_DIR, target.luaScript)}'`;
    }
    wrkCmd += ` '${baseUrl}${target.endpoint}'`;

    const proc = Bun.spawn(shellWithFd(wrkCmd), { stdout: 'pipe', stderr: 'pipe' });
    await proc.exited;
  }
  console.log('[nginx] warmup complete');
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

async function waitForServer(port: number, timeoutMs: number = 60_000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const resp = await fetch(`http://127.0.0.1:${port}/api/ping`);
      if (resp.ok) return;
    } catch {
      // not ready
    }
    await Bun.sleep(500);
  }
  throw new Error(`nginx did not become ready within ${timeoutMs}ms`);
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

async function getPackageVersion(): Promise<string> {
  try {
    const pkgPath = resolve(BENCH_DIR, '..', 'packages', 'bun-server', 'package.json');
    const pkg = await Bun.file(pkgPath).json();
    return pkg.version ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function generateReport(
  tierResults: TierResult[],
  env: { os: string; bunVersion: string; cpuModel: string; cores: string; pkgVersion: string },
  workerCount: number,
): string {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const lines: string[] = [
    '# HTTP Benchmark Report (nginx + Docker Compose)',
    '',
    `> Generated: ${now}`,
    `> CPU: ${env.cpuModel} (${env.cores} cores)`,
    `> OS: ${env.os} | Bun ${env.bunVersion} | @dangao/bun-server ${env.pkgVersion}`,
    `> Workers: ${workerCount} Bun containers behind nginx reverse proxy`,
    `> Stack: wrk (host) → nginx:${NGINX_PORT} → upstream round-robin → bun-worker-{0..${workerCount - 1}}:3000`,
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

// ── Docker / nginx config generation ───────────────────────────────

function generateNginxConf(workerCount: number): string {
  const upstreamEntries = Array.from({ length: workerCount }, (_, i) =>
    `        server bun-worker-${i}:3000;`,
  ).join('\n');

  return `worker_processes auto;

events {
    worker_connections 4096;
    multi_accept on;
}

http {
    access_log off;
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;

    upstream backend {
        keepalive 256;
${upstreamEntries}
    }

    server {
        listen 80;

        location / {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Connection "";
        }
    }
}
`;
}

function generateDockerCompose(workerCount: number): string {
  const workerServices = Array.from({ length: workerCount }, (_, i) => `
  bun-worker-${i}:
    build:
      context: ../..
      dockerfile: benchmark/docker/Dockerfile
    environment:
      - PORT=3000
    expose:
      - "3000"
    networks:
      - bench-net`).join('\n');

  const dependsOn = Array.from({ length: workerCount }, (_, i) =>
    `      bun-worker-${i}:\n        condition: service_started`,
  ).join('\n');

  return `services:
${workerServices}

  nginx:
    image: nginx:alpine
    ports:
      - "${NGINX_PORT}:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
${dependsOn}
    networks:
      - bench-net

networks:
  bench-net:
    driver: bridge
`;
}

// ── main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('[nginx] checking prerequisites...');

  try {
    const which = await $`which wrk`.quiet().text();
    if (!which.trim()) throw new Error('not found');
  } catch {
    console.error('[nginx] wrk is not installed. Install via: brew install wrk');
    process.exit(1);
  }

  try {
    await $`docker info`.quiet();
  } catch {
    console.error('[nginx] docker is not running or not installed');
    process.exit(1);
  }

  try {
    await $`docker compose version`.quiet();
  } catch {
    console.error('[nginx] docker compose is not available');
    process.exit(1);
  }

  const workerCount = Number(process.env.WORKERS ?? DEFAULT_WORKERS);
  const port = NGINX_PORT;

  console.log(`[nginx] generating configs for ${workerCount} workers...`);
  mkdirSync(DOCKER_DIR, { recursive: true });
  writeFileSync(NGINX_CONF, generateNginxConf(workerCount));
  writeFileSync(COMPOSE_FILE, generateDockerCompose(workerCount));

  console.log(`[nginx] building and starting containers...`);
  try {
    await $`docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_FILE} up -d --build --remove-orphans`.cwd(PROJECT_ROOT);
  } catch (err) {
    console.error('[nginx] failed to start containers:', err);
    process.exit(1);
  }

  console.log(`[nginx] waiting for nginx to be ready on port ${port}...`);
  try {
    await waitForServer(port);
  } catch (err) {
    console.error('[nginx]', err);
    await $`docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_FILE} logs`.cwd(PROJECT_ROOT);
    await $`docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_FILE} down`.quiet().cwd(PROJECT_ROOT);
    process.exit(1);
  }

  console.log(`[nginx] all ${workerCount} workers + nginx ready`);

  const baseUrl = `http://127.0.0.1:${port}`;

  await warmup(baseUrl);

  const [env, pkgVersion] = await Promise.all([getEnvironmentInfo(), getPackageVersion()]);
  const envWithPkg = { ...env, pkgVersion };
  const tierResults: TierResult[] = [];

  for (const tier of TIERS) {
    console.log(`\n[nginx] === ${tier.label} tier: -t${tier.threads} -c${tier.connections} -d${tier.duration} ===`);
    const results: WrkResult[] = [];

    for (const target of TARGETS) {
      await Bun.sleep(COOLDOWN_MS);
      console.log(`[nginx]   ${target.name} ...`);
      const result = await runWrk(baseUrl, target, tier);
      results.push(result);
      console.log(`    -> ${result.reqPerSec} req/s, avg ${result.avgLatency} (±${result.latencyStdev}), p99 ${result.p99Latency}, errors ${result.errors}`);
    }

    tierResults.push({ tier, results });
  }

  console.log('\n[nginx] tearing down containers...');
  await $`docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_FILE} down`.quiet().cwd(PROJECT_ROOT);

  // Clean up generated files
  try {
    rmSync(COMPOSE_FILE);
    rmSync(NGINX_CONF);
  } catch {
    // ignore
  }

  const report = generateReport(tierResults, envWithPkg, workerCount);
  console.log('\n' + report);

  await Bun.write(REPORT_PATH, report);
  console.log(`[nginx] report saved to ${REPORT_PATH}`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('[nginx] fatal error:', err);
    $`docker compose -p ${COMPOSE_PROJECT} -f ${COMPOSE_FILE} down`.quiet().cwd(PROJECT_ROOT).then(() => process.exit(1));
  });
}
