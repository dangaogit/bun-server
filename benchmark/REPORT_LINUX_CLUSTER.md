# HTTP Benchmark Report (Cluster / reusePort)

> Generated: 2026-02-27 13:53:35 CPU: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
> (12 cores) OS: linux x64 | Bun 1.3.10 | @dangao/bun-server 1.12.0 Workers: 12
> (reusePort: true) NOTE: reusePort only effective on Linux

## Light (-t2 -c50 -d10s)

| Endpoint              | Req/Sec | Avg Latency | Stdev    | P99 Latency | Transfer/sec | Total Reqs | Errors |
| --------------------- | ------- | ----------- | -------- | ----------- | ------------ | ---------- | ------ |
| GET /ping             | 41.92k  | 706.45us    | 843.78us | 4.18ms      | 27.26MB      | 833,759    | 0      |
| GET /json             | 36.24k  | 811.03us    | 0.95ms   | 4.72ms      | 140.48MB     | 721,416    | 0      |
| GET /users/:id        | 39.63k  | 730.88us    | 821.12us | 4.15ms      | 27.07MB      | 788,628    | 0      |
| GET /search?q=        | 39.28k  | 764.67us    | 0.92ms   | 4.66ms      | 28.03MB      | 781,867    | 0      |
| POST /users           | 34.46k  | 0.85ms      | 0.97ms   | 4.84ms      | 23.67MB      | 685,922    | 0      |
| POST /users/validated | 32.50k  | 0.92ms      | 1.07ms   | 5.30ms      | 23.87MB      | 646,863    | 0      |
| GET /middleware       | 37.20k  | 781.49us    | 0.91ms   | 4.47ms      | 26.20MB      | 740,707    | 0      |
| GET /headers          | 38.61k  | 783.05us    | 0.96ms   | 4.68ms      | 25.12MB      | 768,366    | 0      |
| GET /io               | 22.85k  | 1.17ms      | 1.08ms   | 5.32ms      | 16.08MB      | 454,812    | 0      |

## Medium (-t4 -c200 -d10s)

| Endpoint              | Req/Sec | Avg Latency | Stdev  | P99 Latency | Transfer/sec | Total Reqs | Errors |
| --------------------- | ------- | ----------- | ------ | ----------- | ------------ | ---------- | ------ |
| GET /ping             | 23.85k  | 2.30ms      | 2.18ms | 9.79ms      | 30.95MB      | 952,807    | 0      |
| GET /json             | 21.41k  | 2.53ms      | 2.24ms | 10.28ms     | 165.48MB     | 855,064    | 0      |
| GET /users/:id        | 22.36k  | 2.51ms      | 2.44ms | 11.48ms     | 30.49MB      | 893,041    | 0      |
| GET /search?q=        | 22.15k  | 2.56ms      | 2.90ms | 11.81ms     | 31.51MB      | 884,357    | 0      |
| POST /users           | 19.83k  | 2.79ms      | 2.59ms | 11.94ms     | 27.19MB      | 792,686    | 0      |
| POST /users/validated | 18.84k  | 2.92ms      | 2.61ms | 12.51ms     | 27.58MB      | 751,793    | 0      |
| GET /middleware       | 22.00k  | 2.47ms      | 2.19ms | 10.20ms     | 30.91MB      | 878,221    | 0      |
| GET /headers          | 22.63k  | 2.41ms      | 2.19ms | 10.09ms     | 29.38MB      | 903,221    | 0      |
| GET /io               | 13.17k  | 4.20ms      | 3.51ms | 16.06ms     | 18.49MB      | 525,426    | 0      |

## Heavy (-t8 -c500 -d10s)

| Endpoint              | Req/Sec | Avg Latency | Stdev  | P99 Latency | Transfer/sec | Total Reqs | Errors |
| --------------------- | ------- | ----------- | ------ | ----------- | ------------ | ---------- | ------ |
| GET /ping             | 11.78k  | 5.45ms      | 3.71ms | 17.94ms     | 30.62MB      | 942,650    | 0      |
| GET /json             | 10.44k  | 6.10ms      | 3.82ms | 18.67ms     | 160.95MB     | 833,813    | 0      |
| GET /users/:id        | 11.07k  | 5.85ms      | 4.07ms | 20.27ms     | 30.13MB      | 885,156    | 0      |
| GET /search?q=        | 10.76k  | 5.96ms      | 3.90ms | 19.41ms     | 30.56MB      | 860,384    | 0      |
| POST /users           | 9.86k   | 6.44ms      | 3.85ms | 19.33ms     | 27.01MB      | 788,694    | 0      |
| POST /users/validated | 9.35k   | 6.78ms      | 3.98ms | 19.96ms     | 27.39MB      | 747,901    | 0      |
| GET /middleware       | 11.07k  | 5.73ms      | 3.56ms | 17.60ms     | 31.06MB      | 885,838    | 0      |
| GET /headers          | 11.27k  | 5.80ms      | 4.26ms | 20.84ms     | 29.30MB      | 902,086    | 0      |
| GET /io               | 6.42k   | 10.28ms     | 7.33ms | 36.26ms     | 18.02MB      | 512,692    | 0      |
