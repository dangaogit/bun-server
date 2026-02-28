# HTTP Benchmark Report (nginx + Docker Compose)

> Generated: 2026-02-28 03:12:02
> CPU: Apple M2 Pro (8P + 4E cores)
> OS: darwin arm64 | Bun 1.3.10 | @dangao/bun-server 1.12.1
> Workers: 12 Bun containers behind nginx reverse proxy
> Stack: wrk (host) → nginx:9444 → upstream round-robin → bun-worker-{0..11}:3000

## Light (-t2 -c50 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 16.69k | 1.70ms | 1.35ms | 7.11ms | 12.31MB | 332,010 | 0 |
| GET /json | 14.77k | 1.94ms | 1.66ms | 8.64ms | 58.54MB | 296,794 | 0 |
| GET /users/:id | 16.75k | 1.73ms | 1.48ms | 7.80ms | 12.90MB | 336,493 | 0 |
| GET /search?q= | 16.29k | 1.79ms | 1.53ms | 8.12ms | 13.04MB | 324,107 | 0 |
| POST /users | 15.73k | 2.04ms | 3.24ms | 10.74ms | 12.18MB | 313,025 | 0 |
| POST /users/validated | 16.01k | 1.81ms | 1.55ms | 8.20ms | 13.16MB | 318,603 | 0 |
| GET /middleware | 16.66k | 1.73ms | 1.45ms | 7.66ms | 13.18MB | 331,370 | 0 |
| GET /headers | 16.12k | 1.83ms | 1.76ms | 8.60ms | 11.90MB | 320,932 | 0 |
| GET /io | 13.54k | 2.13ms | 1.79ms | 9.19ms | 10.72MB | 272,193 | 0 |

## Medium (-t4 -c200 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 11.02k | 4.79ms | 2.81ms | 15.93ms | 16.27MB | 443,073 | 0 |
| GET /json | 9.74k | 5.34ms | 2.78ms | 16.17ms | 77.18MB | 387,512 | 0 |
| GET /users/:id | 10.85k | 4.92ms | 3.13ms | 16.89ms | 16.71MB | 431,820 | 0 |
| GET /search?q= | 10.22k | 5.16ms | 3.06ms | 16.64ms | 16.37MB | 410,968 | 0 |
| POST /users | 10.39k | 5.21ms | 3.65ms | 18.96ms | 16.08MB | 417,343 | 0 |
| POST /users/validated | 10.01k | 5.28ms | 3.16ms | 17.05ms | 16.44MB | 398,114 | 0 |
| GET /middleware | 10.56k | 5.12ms | 3.66ms | 18.61ms | 16.70MB | 420,091 | 0 |
| GET /headers | 10.62k | 5.05ms | 3.37ms | 17.89ms | 15.68MB | 422,794 | 0 |
| GET /io | 9.70k | 5.71ms | 4.53ms | 22.48ms | 15.35MB | 385,963 | 0 |

## Heavy (-t8 -c500 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 5.76k | 11.05ms | 5.46ms | 29.86ms | 17.00MB | 458,535 | 0 |
| GET /json | 4.90k | 12.91ms | 5.40ms | 31.83ms | 77.63MB | 389,873 | 0 |
| GET /users/:id | 5.81k | 10.91ms | 5.20ms | 28.33ms | 17.91MB | 462,674 | 0 |
| GET /search?q= | 5.90k | 10.63ms | 4.24ms | 25.30ms | 18.88MB | 469,381 | 0 |
| POST /users | 5.78k | 10.84ms | 4.37ms | 25.70ms | 17.90MB | 460,375 | 0 |
| POST /users/validated | 5.71k | 10.96ms | 4.37ms | 25.65ms | 18.77MB | 454,828 | 0 |
| GET /middleware | 5.79k | 10.89ms | 4.88ms | 28.10ms | 18.33MB | 461,154 | 0 |
| GET /headers | 5.90k | 10.61ms | 4.24ms | 24.51ms | 17.26MB | 469,936 | 0 |
| GET /io | 5.39k | 11.76ms | 6.21ms | 32.40ms | 17.06MB | 429,276 | 0 |
