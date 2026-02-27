# HTTP Benchmark Report

> Generated: 2026-02-27 09:33:48
> CPU: Apple M2 Pro (8P + 4E cores)
> OS: darwin arm64 | Bun 1.3.10 | @dangao/bun-server 1.9.0
> ulimit -n: unlimited (child processes raised to 10240)

## Light (-t2 -c50 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 31.75k | 804.14us | 340.58us | 1.63ms | 20.67MB | 638,163 | 0 |
| GET /json | 28.23k | 0.89ms | 172.19us | 1.71ms | 109.44MB | 567,340 | 0 |
| GET /users/:id | 30.49k | 823.12us | 176.36us | 1.61ms | 20.84MB | 613,021 | 0 |
| GET /search?q= | 29.98k | 837.50us | 171.97us | 1.64ms | 21.39MB | 602,468 | 0 |
| POST /users | 27.47k | 0.92ms | 304.32us | 1.81ms | 18.77MB | 549,353 | 0 |
| POST /users/validated | 26.52k | 0.95ms | 249.02us | 1.85ms | 19.47MB | 532,760 | 0 |
| GET /middleware | 29.90k | 839.56us | 171.86us | 1.63ms | 21.05MB | 600,935 | 0 |
| GET /headers | 30.79k | 819.59us | 220.68us | 1.63ms | 20.03MB | 618,645 | 0 |
| GET /io | 21.72k | 1.15ms | 280.05us | 2.26ms | 15.30MB | 436,737 | 0 |

## Medium (-t4 -c200 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 15.88k | 3.15ms | 311.49us | 3.89ms | 20.66MB | 631,699 | 0 |
| GET /json | 13.78k | 3.66ms | 565.13us | 4.68ms | 106.78MB | 553,637 | 0 |
| GET /users/:id | 14.65k | 3.44ms | 663.57us | 4.31ms | 20.02MB | 589,097 | 0 |
| GET /search?q= | 14.53k | 3.46ms | 521.62us | 4.25ms | 20.73MB | 584,093 | 0 |
| POST /users | 13.25k | 3.82ms | 0.91ms | 6.27ms | 18.21MB | 527,556 | 0 |
| POST /users/validated | 13.19k | 3.80ms | 294.45us | 4.63ms | 19.38MB | 530,356 | 0 |
| GET /middleware | 14.45k | 3.47ms | 295.26us | 4.36ms | 20.35MB | 580,939 | 0 |
| GET /headers | 14.96k | 3.35ms | 298.51us | 4.11ms | 19.47MB | 601,417 | 0 |
| GET /io | 10.40k | 4.82ms | 593.59us | 6.24ms | 14.65MB | 414,236 | 0 |

## Heavy (-t8 -c500 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 7.49k | 8.31ms | 0.99ms | 9.89ms | 19.48MB | 596,070 | 0 |
| GET /json | 6.69k | 9.30ms | 1.21ms | 11.18ms | 103.76MB | 532,808 | 0 |
| GET /users/:id | 7.32k | 8.51ms | 1.19ms | 9.86ms | 19.98MB | 582,411 | 0 |
| GET /search?q= | 7.18k | 8.65ms | 0.85ms | 10.09ms | 20.48MB | 571,248 | 0 |
| POST /users | 6.60k | 9.39ms | 1.34ms | 11.19ms | 18.11MB | 525,000 | 0 |
| POST /users/validated | 6.47k | 9.58ms | 673.06us | 10.75ms | 19.01MB | 515,275 | 0 |
| GET /middleware | 7.25k | 8.56ms | 549.29us | 9.61ms | 20.40MB | 576,824 | 0 |
| GET /headers | 7.31k | 8.51ms | 1.60ms | 11.50ms | 19.01MB | 581,529 | 0 |
| GET /io | 5.16k | 12.04ms | 1.47ms | 15.40ms | 14.52MB | 411,908 | 0 |
