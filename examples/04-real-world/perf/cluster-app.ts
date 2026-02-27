/**
 * Multi-process cluster example using reusePort.
 *
 * Each worker binds to the same port with SO_REUSEPORT enabled.
 * The kernel distributes incoming connections across workers.
 *
 * NOTE: reusePort only works on Linux. macOS/Windows will silently
 * ignore the option and all workers except the first will fail to bind.
 *
 * Usage:
 *   bun examples/04-real-world/perf/cluster-app.ts
 *
 * Benchmark:
 *   wrk -t8 -c500 -d30s http://localhost:3300/api/ping
 */

import { spawn } from 'bun';

const WORKER_SCRIPT = new URL('./cluster-worker.ts', import.meta.url).pathname;
const PORT = Number(process.env.PORT ?? 3300);
const WORKERS = Number(process.env.WORKERS ?? navigator.hardwareConcurrency);

console.log(`Starting ${WORKERS} workers on port ${PORT} (reusePort)...`);
console.log(`Platform: ${process.platform} (reusePort effective on Linux only)\n`);

const procs: ReturnType<typeof spawn>[] = [];

for (let i = 0; i < WORKERS; i++) {
  procs.push(
    spawn({
      cmd: ['bun', 'run', WORKER_SCRIPT],
      env: { ...process.env, PORT: String(PORT), WORKER_ID: String(i) },
      stdout: 'inherit',
      stderr: 'inherit',
    }),
  );
}

function killAll(): void {
  for (const p of procs) p.kill();
}

process.on('SIGINT', killAll);
process.on('SIGTERM', killAll);

console.log(`\nAll ${WORKERS} workers started.`);
console.log(`  curl http://localhost:${PORT}/api/ping`);
console.log(`  wrk -t8 -c500 -d30s http://localhost:${PORT}/api/ping`);
