# HTTP Benchmark Report

> Generated: 2026-02-27 09:18:10
> CPU: Apple M2 Pro (8P + 4E cores)
> OS: darwin arm64 | Bun 1.3.10 | @dangao/bun-server 1.9.0
> ulimit -n: unlimited (child processes raised to 10240)

## Light (-t2 -c50 -d10s)

| Endpoint | Req/Sec | Avg Latency | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------------|--------------|------------|--------|
| GET /ping | 30.95k | 815.81us | 1.62ms | 20.15MB | 622,221 | 0 |
| GET /json | 27.88k | 0.90ms | 1.73ms | 108.12MB | 560,464 | 0 |
| GET /users/:id | 29.85k | 840.94us | 1.63ms | 20.39MB | 599,904 | 0 |
| GET /search?q= | 28.73k | 0.88ms | 1.73ms | 20.50MB | 577,471 | 0 |
| POST /users | 26.79k | 0.94ms | 1.79ms | 18.41MB | 538,582 | 0 |
| POST /users/validated | 25.57k | 0.98ms | 1.88ms | 18.79MB | 514,086 | 0 |
| GET /middleware | 27.70k | 0.92ms | 1.98ms | 19.50MB | 556,780 | 0 |
| GET /headers | 27.80k | 0.92ms | 2.06ms | 18.10MB | 558,992 | 0 |
| GET /io | 21.09k | 1.22ms | 2.74ms | 14.84MB | 423,684 | 0 |

## Medium (-t4 -c200 -d10s)

| Endpoint | Req/Sec | Avg Latency | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------------|--------------|------------|--------|
| GET /ping | 15.00k | 3.36ms | 4.77ms | 19.52MB | 602,740 | 0 |
| GET /json | 13.48k | 3.73ms | 4.64ms | 104.55MB | 536,721 | 0 |
| GET /users/:id | 14.69k | 3.41ms | 4.17ms | 19.97MB | 587,541 | 0 |
| GET /search?q= | 14.18k | 3.56ms | 5.15ms | 20.20MB | 568,950 | 0 |
| POST /users | 13.10k | 3.83ms | 4.69ms | 17.99MB | 526,379 | 0 |
| POST /users/validated | 12.31k | 4.08ms | 5.16ms | 18.08MB | 494,924 | 0 |
| GET /middleware | 14.09k | 3.56ms | 4.46ms | 19.83MB | 566,327 | 0 |
| GET /headers | 14.44k | 3.50ms | 4.37ms | 18.80MB | 580,523 | 0 |
| GET /io | 10.24k | 4.90ms | 6.26ms | 14.41MB | 407,791 | 0 |

## Heavy (-t8 -c500 -d10s)

| Endpoint | Req/Sec | Avg Latency | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------------|--------------|------------|--------|
| GET /ping | 7.29k | 8.50ms | 9.87ms | 18.98MB | 580,580 | 0 |
| GET /json | 6.53k | 9.50ms | 10.76ms | 101.29MB | 525,210 | 0 |
| GET /users/:id | 7.12k | 8.72ms | 9.88ms | 19.43MB | 571,680 | 0 |
| GET /search?q= | 6.97k | 8.92ms | 10.25ms | 19.90MB | 555,136 | 0 |
| POST /users | 6.29k | 9.87ms | 12.09ms | 17.16MB | 502,284 | 0 |
| POST /users/validated | 6.20k | 10.01ms | 11.29ms | 18.20MB | 493,710 | 0 |
| GET /middleware | 6.77k | 9.20ms | 11.87ms | 19.03MB | 543,509 | 0 |
| GET /headers | 6.77k | 9.19ms | 18.18ms | 17.52MB | 541,086 | 0 |
| GET /io | 4.86k | 12.81ms | 17.98ms | 13.66MB | 387,528 | 0 |
