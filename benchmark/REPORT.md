# HTTP Benchmark Report

> Generated: 2026-02-27 08:37:28
> CPU: Apple M2 Pro
> OS: darwin arm64 | Bun 1.3.10 | @dangao/bun-server 1.9.0
> wrk params: -t2 -c50 -d10s

| Endpoint | Req/Sec | Avg Latency | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------------|--------------|------------|--------|
| GET /ping | 32.09k | 785.62us | 1.58ms | 20.88MB | 644,803 | 0 |
| GET /json | 28.29k | 0.89ms | 1.71ms | 109.65MB | 568,418 | 0 |
| GET /users/:id | 30.40k | 828.67us | 1.64ms | 20.77MB | 611,134 | 0 |
| GET /search?q= | 29.02k | 0.88ms | 1.89ms | 20.60MB | 580,370 | 0 |
| POST /users | 27.10k | 0.93ms | 1.77ms | 18.63MB | 544,928 | 0 |
| POST /users/validated | 25.81k | 0.98ms | 1.90ms | 18.95MB | 518,604 | 0 |
| GET /middleware | 28.59k | 0.88ms | 1.74ms | 20.13MB | 574,726 | 0 |
| GET /headers | 29.76k | 846.11us | 1.66ms | 19.37MB | 598,080 | 0 |
