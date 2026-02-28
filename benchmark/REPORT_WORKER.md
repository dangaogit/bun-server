# HTTP Benchmark Report (ClusterManager)

> Generated: 2026-02-28 02:41:59
> CPU: Apple M2 Pro (8P + 4E cores)
> OS: darwin arm64 | Bun 1.3.10 | @dangao/bun-server 1.12.0
> Workers: 12 (ClusterManager, reusePort: true)
> NOTE: reusePort only effective on Linux

## Light (-t2 -c50 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 30.85k | 824.60us | 283.38us | 1.75ms | 20.08MB | 619,990 | 0 |
| GET /json | 26.92k | 0.94ms | 296.82us | 1.88ms | 104.32MB | 540,814 | 0 |
| GET /users/:id | 29.41k | 0.87ms | 299.19us | 1.80ms | 20.09MB | 591,057 | 0 |
| GET /search?q= | 29.72k | 845.30us | 186.67us | 1.64ms | 21.21MB | 597,335 | 0 |
| POST /users | 27.54k | 0.91ms | 188.39us | 1.74ms | 18.91MB | 553,355 | 0 |
| POST /users/validated | 26.15k | 0.97ms | 280.05us | 1.93ms | 19.21MB | 525,580 | 0 |
| GET /middleware | 29.84k | 842.27us | 184.26us | 1.64ms | 21.00MB | 599,525 | 0 |
| GET /headers | 30.91k | 815.38us | 213.94us | 1.63ms | 20.13MB | 621,419 | 0 |
| GET /io | 21.62k | 1.16ms | 294.50us | 2.39ms | 15.22MB | 434,517 | 0 |

## Medium (-t4 -c200 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 15.82k | 3.17ms | 353.33us | 4.00ms | 20.54MB | 634,463 | 0 |
| GET /json | 13.93k | 3.60ms | 324.82us | 4.48ms | 107.94MB | 559,747 | 0 |
| GET /users/:id | 15.34k | 3.27ms | 321.79us | 4.10ms | 20.95MB | 610,323 | 0 |
| GET /search?q= | 14.87k | 3.37ms | 322.21us | 4.21ms | 21.22MB | 597,617 | 0 |
| POST /users | 13.69k | 3.66ms | 345.97us | 4.55ms | 18.80MB | 550,108 | 0 |
| POST /users/validated | 13.06k | 3.84ms | 438.97us | 4.86ms | 19.18MB | 519,810 | 0 |
| GET /middleware | 14.70k | 3.41ms | 341.25us | 4.28ms | 20.70MB | 591,105 | 0 |
| GET /headers | 15.25k | 3.29ms | 323.96us | 4.08ms | 19.84MB | 612,843 | 0 |
| GET /io | 10.48k | 4.78ms | 553.87us | 6.24ms | 14.75MB | 417,542 | 0 |

## Heavy (-t8 -c500 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 7.72k | 8.10ms | 1.68ms | 9.92ms | 20.09MB | 614,754 | 0 |
| GET /json | 6.89k | 8.99ms | 701.03us | 10.27ms | 106.90MB | 548,848 | 0 |
| GET /users/:id | 7.47k | 8.32ms | 645.38us | 9.74ms | 20.40MB | 594,420 | 0 |
| GET /search?q= | 7.39k | 8.38ms | 736.72us | 9.83ms | 21.07MB | 593,624 | 0 |
| POST /users | 6.83k | 9.09ms | 0.90ms | 10.75ms | 18.65MB | 545,876 | 0 |
| POST /users/validated | 6.55k | 9.47ms | 715.22us | 10.89ms | 19.20MB | 525,531 | 0 |
| GET /middleware | 7.42k | 8.36ms | 646.79us | 9.85ms | 20.88MB | 590,786 | 0 |
| GET /headers | 7.51k | 8.27ms | 787.66us | 10.08ms | 19.52MB | 603,003 | 0 |
| GET /io | 5.23k | 11.87ms | 1.07ms | 14.23ms | 14.72MB | 417,233 | 0 |
