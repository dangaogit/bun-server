# HTTP Benchmark Report

> Generated: 2026-02-27 08:56:14
> CPU: Apple M2 Pro (8P + 4E cores)
> OS: darwin arm64 | Bun 1.3.10 | @dangao/bun-server 1.9.0

## Light (-t2 -c50 -d10s)

| Endpoint | Req/Sec | Avg Latency | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------------|--------------|------------|--------|
| GET /ping | 31.97k | 784.89us | 1.56ms | 20.82MB | 642,825 | 0 |
| GET /json | 27.71k | 0.91ms | 1.78ms | 107.44MB | 556,982 | 0 |
| GET /users/:id | 30.40k | 826.46us | 1.62ms | 20.77MB | 610,969 | 0 |
| GET /search?q= | 29.49k | 0.86ms | 1.69ms | 21.03MB | 592,408 | 0 |
| POST /users | 27.51k | 0.92ms | 1.77ms | 18.89MB | 552,676 | 0 |
| POST /users/validated | 26.55k | 0.95ms | 1.84ms | 19.50MB | 533,684 | 0 |
| GET /middleware | 29.69k | 845.58us | 1.64ms | 20.90MB | 596,744 | 0 |
| GET /headers | 30.01k | 847.13us | 1.69ms | 19.53MB | 602,978 | 0 |
| GET /io | 21.39k | 1.17ms | 2.37ms | 15.05MB | 425,491 | 0 |

## Medium (-t4 -c200 -d10s)

| Endpoint | Req/Sec | Avg Latency | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------------|--------------|------------|--------|
| GET /ping | 14.76k | 3.42ms | 5.05ms | 19.22MB | 593,367 | 0 |
| GET /json | 13.49k | 3.72ms | 4.62ms | 104.33MB | 540,879 | 0 |
| GET /users/:id | 14.45k | 3.49ms | 4.87ms | 19.74MB | 580,821 | 0 |
| GET /search?q= | 14.16k | 3.54ms | 4.34ms | 20.21MB | 569,356 | 0 |
| POST /users | 13.06k | 3.86ms | 4.92ms | 17.95MB | 525,112 | 0 |
| POST /users/validated | 12.42k | 4.06ms | 5.13ms | 18.25MB | 499,328 | 0 |
| GET /middleware | 13.27k | 4.91ms | 57.05ms | 18.60MB | 528,762 | 0 |
| GET /headers | 14.38k | 3.49ms | 4.19ms | 18.71MB | 577,885 | 0 |
| GET /io | 10.37k | 4.85ms | 6.54ms | 14.60MB | 413,112 | 0 |

## Heavy (-t8 -c500 -d10s)

| Endpoint | Req/Sec | Avg Latency | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------------|--------------|------------|--------|
| GET /ping | 7.34k | 8.45ms | 9.64ms | 19.10MB | 590,051 | 0 |
| GET /json | 6.68k | 9.28ms | 10.56ms | 102.82MB | 533,136 | 0 |
| GET /users/:id | 7.18k | 8.62ms | 9.98ms | 19.52MB | 574,487 | 0 |
| GET /search?q= | 7.09k | 8.77ms | 10.16ms | 20.21MB | 569,354 | 0 |
| POST /users | 6.52k | 9.50ms | 10.82ms | 17.77MB | 519,874 | 0 |
| POST /users/validated | 6.28k | 9.87ms | 11.40ms | 18.43MB | 499,783 | 0 |
| GET /middleware | 7.12k | 8.69ms | 9.82ms | 20.06MB | 567,207 | 0 |
| GET /headers | 7.26k | 8.54ms | 9.77ms | 18.89MB | 577,898 | 0 |
| GET /io | 5.10k | 12.19ms | 15.10ms | 14.35MB | 406,796 | 0 |
