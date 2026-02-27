# HTTP Benchmark Report

> Generated: 2026-02-27 13:52:34
> CPU: Apple M2 Pro (8P + 4E cores)
> OS: darwin arm64 | Bun 1.3.10 | @dangao/bun-server 1.12.0
> ulimit -n: unlimited (child processes raised to 10240)

## Light (-t2 -c50 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 32.01k | 784.48us | 176.41us | 1.58ms | 20.84MB | 643,366 | 0 |
| GET /json | 28.04k | 0.91ms | 328.04us | 1.81ms | 108.69MB | 563,447 | 0 |
| GET /users/:id | 30.57k | 821.33us | 178.45us | 1.63ms | 20.88MB | 614,351 | 0 |
| GET /search?q= | 29.98k | 838.10us | 188.35us | 1.67ms | 21.39MB | 602,496 | 0 |
| POST /users | 27.49k | 0.93ms | 323.63us | 1.84ms | 18.88MB | 552,377 | 0 |
| POST /users/validated | 26.90k | 0.93ms | 181.79us | 1.81ms | 19.76MB | 540,633 | 0 |
| GET /middleware | 29.85k | 844.81us | 224.80us | 1.69ms | 21.02MB | 600,035 | 0 |
| GET /headers | 31.00k | 809.96us | 179.37us | 1.62ms | 20.18MB | 623,097 | 0 |
| GET /io | 21.57k | 1.16ms | 284.67us | 2.28ms | 15.19MB | 429,298 | 0 |

## Medium (-t4 -c200 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 15.78k | 3.19ms | 607.23us | 4.21ms | 20.54MB | 628,537 | 0 |
| GET /json | 13.85k | 3.62ms | 316.07us | 4.53ms | 107.42MB | 556,927 | 0 |
| GET /users/:id | 14.91k | 3.39ms | 737.50us | 5.21ms | 20.32MB | 598,071 | 0 |
| GET /search?q= | 14.68k | 3.43ms | 594.84us | 4.38ms | 20.93MB | 589,886 | 0 |
| POST /users | 13.65k | 3.67ms | 423.14us | 4.60ms | 18.62MB | 544,737 | 0 |
| POST /users/validated | 13.05k | 3.86ms | 690.56us | 5.04ms | 19.07MB | 522,149 | 0 |
| GET /middleware | 14.62k | 3.43ms | 323.64us | 4.28ms | 20.57MB | 587,305 | 0 |
| GET /headers | 14.87k | 3.38ms | 522.94us | 4.41ms | 19.36MB | 597,814 | 0 |
| GET /io | 10.52k | 4.76ms | 517.50us | 6.12ms | 14.81MB | 419,311 | 0 |

## Heavy (-t8 -c500 -d10s)

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 7.72k | 8.04ms | 1.52ms | 9.81ms | 20.08MB | 614,082 | 0 |
| GET /json | 7.00k | 8.85ms | 748.94us | 10.02ms | 108.14MB | 560,776 | 0 |
| GET /users/:id | 7.58k | 8.19ms | 762.76us | 9.47ms | 20.69MB | 603,300 | 0 |
| GET /search?q= | 7.46k | 8.29ms | 755.75us | 9.62ms | 21.30MB | 600,216 | 0 |
| POST /users | 6.85k | 9.07ms | 0.89ms | 10.33ms | 18.81MB | 545,516 | 0 |
| POST /users/validated | 6.56k | 9.48ms | 1.45ms | 11.06ms | 19.27MB | 527,472 | 0 |
| GET /middleware | 7.39k | 8.35ms | 816.33us | 9.61ms | 20.80MB | 588,198 | 0 |
| GET /headers | 7.71k | 8.01ms | 848.14us | 9.44ms | 20.03MB | 618,693 | 0 |
| GET /io | 5.24k | 11.81ms | 1.19ms | 14.23ms | 14.75MB | 418,114 | 0 |
