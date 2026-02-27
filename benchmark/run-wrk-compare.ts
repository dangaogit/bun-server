import { $ } from 'bun';
import { resolve } from 'path';

const BENCH_DIR = import.meta.dir;
const WRK_DIR = resolve(BENCH_DIR, 'wrk');
const REPORT_PATH = resolve(BENCH_DIR, 'REPORT_COMPARE.md');

const MIN_FD_LIMIT = 10240;
const COOLDOWN_MS = 1500;
const FRAMEWORK_COOLDOWN_MS = 3000;
const WARMUP_DURATION = '3s';
const WARMUP_THREADS = 2;
const WARMUP_CONNECTIONS = 10;
const SERVER_TIMEOUT_MS = 30_000;

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

interface FrameworkConfig {
  name: string;
  script: string;
}

interface FrameworkTierResult {
  framework: FrameworkConfig;
  tier: TierConfig;
  results: WrkResult[];
}

const FRAMEWORKS: FrameworkConfig[] = [
  { name: 'bun-server', script: 'wrk-server.ts' },
  { name: 'express',    script: 'wrk-server-express.ts' },
  { name: 'nestjs',     script: 'wrk-server-nestjs.ts' },
];

const TARGETS: BenchTarget[] = [
  { name: 'GET /ping',             endpoint: '/api/ping' },
  { name: 'GET /json',             endpoint: '/api/json' },
  { name: 'GET /users/:id',        endpoint: '/api/users/42' },
  { name: 'GET /search?q=',        endpoint: '/api/search?q=hello' },
  { name: 'POST /users',           endpoint: '/api/users',           luaScript: 'post-json.lua' },
  { name: 'POST /users/validated',  endpoint: '/api/users/validated', luaScript: 'post-validate.lua' },
  { name: 'GET /middleware',        endpoint: '/api/middleware' },
  { name: 'GET /headers',          endpoint: '/api/headers' },
  { name: 'GET /io',               endpoint: '/api/io' },
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

  const errorsMatch = stdout.match(
    /Socket errors:.*?(\d+)\s+connect.*?(\d+)\s+read.*?(\d+)\s+write.*?(\d+)\s+timeout/,
  );
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

async function waitForServer(port: number, timeoutMs: number = SERVER_TIMEOUT_MS): Promise<void> {
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

async function getCurrentFdLimit(): Promise<number | 'unlimited'> {
  try {
    const proc = Bun.spawn(['sh', '-c', 'ulimit -n'], { stdout: 'pipe', stderr: 'pipe' });
    const raw = (await new Response(proc.stdout).text()).trim();
    await proc.exited;
    if (raw === 'unlimited') return 'unlimited';
    return Number(raw) || 256;
  } catch {
    return 256;
  }
}

async function getEnvironmentInfo(): Promise<{
  os: string;
  bunVersion: string;
  cpuModel: string;
  cores: string;
  fdLimit: number | 'unlimited';
}> {
  const os = `${process.platform} ${process.arch}`;
  const bunVersion = Bun.version;
  const fdLimit = await getCurrentFdLimit();

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

  return { os, bunVersion, cpuModel, cores, fdLimit };
}

function shellWithFd(cmd: string): string[] {
  return ['sh', '-c', `ulimit -n ${MIN_FD_LIMIT} 2>/dev/null; ${cmd}`];
}

async function startServer(fw: FrameworkConfig): Promise<{ proc: ReturnType<typeof Bun.spawn>; port: number }> {
  const script = resolve(BENCH_DIR, fw.script);
  const proc = Bun.spawn(shellWithFd(`exec bun run '${script}'`), {
    stdout: 'pipe',
    stderr: 'inherit',
    env: { ...process.env, PORT: '0' },
  });

  let port: number | null = null;
  const reader = proc.stdout.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const deadline = Date.now() + SERVER_TIMEOUT_MS;

  while (Date.now() < deadline) {
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
    proc.kill();
    throw new Error(`[${fw.name}] failed to detect server port`);
  }

  return { proc, port };
}

async function warmup(baseUrl: string): Promise<void> {
  for (const target of TARGETS) {
    let wrkCmd = `wrk -t${WARMUP_THREADS} -c${WARMUP_CONNECTIONS} -d${WARMUP_DURATION}`;
    if (target.luaScript) {
      wrkCmd += ` -s '${resolve(WRK_DIR, target.luaScript)}'`;
    }
    wrkCmd += ` '${baseUrl}${target.endpoint}'`;
    const proc = Bun.spawn(shellWithFd(wrkCmd), { stdout: 'pipe', stderr: 'pipe' });
    await proc.exited;
  }
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

async function shutdownServer(proc: ReturnType<typeof Bun.spawn>): Promise<void> {
  proc.kill('SIGTERM');
  const timeout = setTimeout(() => proc.kill('SIGKILL'), 5_000);
  await proc.exited;
  clearTimeout(timeout);
}

function pickBest(values: number[]): number {
  return Math.max(...values);
}

function generateCompareReport(
  allResults: FrameworkTierResult[],
  env: { os: string; bunVersion: string; cpuModel: string; cores: string; fdLimit: number | 'unlimited' },
): string {
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const frameworkNames = FRAMEWORKS.map((f) => f.name);

  const lines: string[] = [
    '# Framework Comparison Benchmark Report',
    '',
    `> Generated: ${now}`,
    `> CPU: ${env.cpuModel} (${env.cores} cores)`,
    `> OS: ${env.os} | Bun ${env.bunVersion} (all frameworks run on Bun runtime)`,
    `> ulimit -n: ${env.fdLimit} (child processes raised to ${MIN_FD_LIMIT})`,
    '',
  ];

  const tiers = [...new Set(allResults.map((r) => r.tier.label))];

  for (const tierLabel of tiers) {
    const tierResults = allResults.filter((r) => r.tier.label === tierLabel);
    const tier = tierResults[0].tier;

    lines.push(`## ${tier.label} (-t${tier.threads} -c${tier.connections} -d${tier.duration})`);
    lines.push('');

    // Summary comparison table (Req/Sec)
    lines.push('### Req/Sec Comparison');
    lines.push('');
    const headerCols = ['Endpoint', ...frameworkNames.map((n) => `${n}`)];
    lines.push(`| ${headerCols.join(' | ')} |`);
    lines.push(`| ${headerCols.map(() => '---').join(' | ')} |`);

    for (const target of TARGETS) {
      const cells: string[] = [target.name];
      const nums: number[] = [];

      for (const fwName of frameworkNames) {
        const fwResult = tierResults.find((r) => r.framework.name === fwName);
        const result = fwResult?.results.find((r) => r.name === target.name);
        const val = result?.reqPerSec ?? 'N/A';
        const num = result?.reqPerSecNum ?? 0;
        cells.push(val);
        nums.push(num);
      }

      const bestIdx = nums.indexOf(pickBest(nums));
      if (nums[bestIdx] > 0) {
        cells[bestIdx + 1] = `**${cells[bestIdx + 1]}**`;
      }

      lines.push(`| ${cells.join(' | ')} |`);
    }

    lines.push('');

    // Latency comparison table
    lines.push('### Avg Latency Comparison');
    lines.push('');
    const latHeaderCols = ['Endpoint', ...frameworkNames.map((n) => `${n}`)];
    lines.push(`| ${latHeaderCols.join(' | ')} |`);
    lines.push(`| ${latHeaderCols.map(() => '---').join(' | ')} |`);

    for (const target of TARGETS) {
      const cells: string[] = [target.name];
      for (const fwName of frameworkNames) {
        const fwResult = tierResults.find((r) => r.framework.name === fwName);
        const result = fwResult?.results.find((r) => r.name === target.name);
        cells.push(result?.avgLatency ?? 'N/A');
      }
      lines.push(`| ${cells.join(' | ')} |`);
    }

    lines.push('');

    // Detailed results per framework
    lines.push('### Detailed Results');
    lines.push('');

    for (const fwName of frameworkNames) {
      const fwResult = tierResults.find((r) => r.framework.name === fwName);
      if (!fwResult) continue;

      lines.push(`#### ${fwName}`);
      lines.push('');
      lines.push('| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |');
      lines.push('|----------|---------|-------------|-------|-------------|--------------|------------|--------|');

      for (const r of fwResult.results) {
        lines.push(
          `| ${r.name} | ${r.reqPerSec} | ${r.avgLatency} | ${r.latencyStdev} | ${r.p99Latency} | ${r.transferPerSec} | ${r.totalRequests} | ${r.errors} |`,
        );
      }

      lines.push('');
    }
  }

  return lines.join('\n');
}

async function main(): Promise<void> {
  console.log('[compare] Framework Comparison Benchmark');
  console.log('[compare] ================================');

  console.log('[compare] checking wrk...');
  try {
    const which = await $`which wrk`.quiet().text();
    if (!which.trim()) throw new Error('not found');
  } catch {
    console.error('[compare] wrk is not installed. Install via: brew install wrk / apt install wrk');
    process.exit(1);
  }

  const fdLimit = await getCurrentFdLimit();
  const maxConn = Math.max(...TIERS.map((t) => t.connections));
  if (fdLimit !== 'unlimited' && fdLimit < maxConn * 2) {
    console.warn(`[compare] WARNING: shell ulimit -n is ${fdLimit} (need >=${maxConn * 2} for -c${maxConn}).`);
    console.warn(`[compare] Child processes will be raised to ${MIN_FD_LIMIT}.`);
    console.warn(`[compare] For best results, run:  ulimit -n ${MIN_FD_LIMIT} && bun benchmark/run-wrk-compare.ts`);
  }

  const tierIndex = Number(process.env.TIER ?? 0);
  const selectedTiers = process.env.TIER !== undefined ? [TIERS[tierIndex]] : TIERS;
  console.log(`[compare] tiers: ${selectedTiers.map((t) => t.label).join(', ')} (set TIER=0|1|2 to pick one)`);

  const env = await getEnvironmentInfo();
  const allResults: FrameworkTierResult[] = [];

  for (const fw of FRAMEWORKS) {
    console.log(`\n[compare] ==============================`);
    console.log(`[compare]  ${fw.name}`);
    console.log(`[compare] ==============================`);

    let proc: ReturnType<typeof Bun.spawn>;
    let port: number;

    try {
      const server = await startServer(fw);
      proc = server.proc;
      port = server.port;
    } catch (err) {
      console.error(`[compare] SKIP ${fw.name}: ${err}`);
      continue;
    }

    console.log(`[compare] ${fw.name} ready on port ${port}`);
    await waitForServer(port);

    const baseUrl = `http://127.0.0.1:${port}`;

    console.log(`[compare] warming up ${fw.name}...`);
    await warmup(baseUrl);
    console.log(`[compare] warmup done`);

    for (const tier of selectedTiers) {
      console.log(`\n[compare] --- ${fw.name} / ${tier.label} (-t${tier.threads} -c${tier.connections} -d${tier.duration}) ---`);
      const results: WrkResult[] = [];

      for (const target of TARGETS) {
        await Bun.sleep(COOLDOWN_MS);
        process.stdout.write(`[compare]   ${target.name} ... `);
        const result = await runWrk(baseUrl, target, tier);
        results.push(result);
        console.log(`${result.reqPerSec} req/s, avg ${result.avgLatency}, p99 ${result.p99Latency}, err ${result.errors}`);
      }

      allResults.push({ framework: fw, tier, results });
    }

    await shutdownServer(proc!);
    console.log(`[compare] ${fw.name} stopped`);

    await Bun.sleep(FRAMEWORK_COOLDOWN_MS);
  }

  if (allResults.length === 0) {
    console.error('[compare] no results collected');
    process.exit(1);
  }

  const report = generateCompareReport(allResults, env);
  console.log('\n' + report);

  await Bun.write(REPORT_PATH, report);
  console.log(`[compare] report saved to ${REPORT_PATH}`);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error('[compare] fatal error:', err);
    process.exit(1);
  });
}
