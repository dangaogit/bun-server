# HTTP Benchmark Report (Cluster / reusePort)

> Generated: 2026-02-27 10:46:10 CPU: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
> (12 cores) OS: linux x64 | Bun 1.3.10 | @dangao/bun-server 1.9.0 Workers: 12
> (reusePort: true) NOTE: reusePort only effective on Linux

## Light (-t2 -c50 -d10s)

| Endpoint              | Req/Sec | Avg Latency | Stdev  | P99 Latency | Transfer/sec | Total Reqs | Errors |
| --------------------- | ------- | ----------- | ------ | ----------- | ------------ | ---------- | ------ |
| GET /ping             | 40.18k  | 756.19us    | 0.93ms | 4.50ms      | 26.03MB      | 803,591    | 0      |
| GET /json             | 36.75k  | 801.94us    | 0.94ms | 4.63ms      | 142.45MB     | 731,319    | 0      |
| GET /users/:id        | 38.61k  | 776.21us    | 0.93ms | 4.57ms      | 26.37MB      | 768,375    | 0      |
| GET /search?q=        | 37.62k  | 776.34us    | 0.91ms | 4.58ms      | 26.83MB      | 748,462    | 0      |
| POST /users           | 35.94k  | 822.71us    | 0.94ms | 4.71ms      | 24.68MB      | 715,156    | 0      |
| POST /users/validated | 33.78k  | 0.86ms      | 0.96ms | 4.82ms      | 24.80MB      | 672,479    | 0      |
| GET /middleware       | 37.68k  | 806.11us    | 0.97ms | 4.78ms      | 26.52MB      | 749,633    | 0      |
| GET /headers          | 38.52k  | 772.06us    | 0.94ms | 4.61ms      | 25.06MB      | 766,403    | 0      |
| GET /io               | 23.91k  | 1.13ms      | 1.06ms | 5.21ms      | 16.83MB      | 475,853    | 0      |

## Medium (-t4 -c200 -d10s)

| Endpoint              | Req/Sec | Avg Latency | Stdev  | P99 Latency | Transfer/sec | Total Reqs | Errors |
| --------------------- | ------- | ----------- | ------ | ----------- | ------------ | ---------- | ------ |
| GET /ping             | 23.64k  | 2.33ms      | 2.19ms | 9.97ms      | 30.67MB      | 944,613    | 0      |
| GET /json             | 21.30k  | 2.54ms      | 2.24ms | 10.35ms     | 164.67MB     | 850,492    | 0      |
| GET /users/:id        | 22.57k  | 2.40ms      | 2.16ms | 9.87ms      | 30.75MB      | 901,439    | 0      |
| GET /search?q=        | 22.18k  | 2.46ms      | 2.19ms | 10.16ms     | 31.55MB      | 884,895    | 0      |
| POST /users           | 19.94k  | 2.77ms      | 2.57ms | 12.19ms     | 27.31MB      | 796,564    | 0      |
| POST /users/validated | 18.70k  | 2.98ms      | 2.75ms | 13.06ms     | 27.40MB      | 746,906    | 0      |
| GET /middleware       | 22.30k  | 2.49ms      | 2.40ms | 11.26ms     | 31.31MB      | 891,002    | 0      |
| GET /headers          | 22.65k  | 2.44ms      | 2.32ms | 10.81ms     | 29.35MB      | 904,551    | 0      |
| GET /io               | 13.22k  | 4.16ms      | 3.45ms | 15.85ms     | 18.56MB      | 527,485    | 0      |

## Heavy (-t8 -c500 -d10s)

| Endpoint              | Req/Sec | Avg Latency | Stdev  | P99 Latency | Transfer/sec | Total Reqs | Errors |
| --------------------- | ------- | ----------- | ------ | ----------- | ------------ | ---------- | ------ |
| GET /ping             | 11.89k  | 5.36ms      | 3.59ms | 17.39ms     | 30.83MB      | 951,271    | 0      |
| GET /json             | 10.52k  | 6.06ms      | 3.82ms | 18.86ms     | 162.38MB     | 841,435    | 0      |
| GET /users/:id        | 11.15k  | 5.72ms      | 3.71ms | 18.13ms     | 30.38MB      | 892,501    | 0      |
| GET /search?q=        | 11.05k  | 5.80ms      | 4.12ms | 18.17ms     | 31.38MB      | 883,145    | 0      |
| POST /users           | 9.87k   | 6.44ms      | 3.87ms | 19.47ms     | 27.04MB      | 789,984    | 0      |
| POST /users/validated | 9.25k   | 6.86ms      | 4.02ms | 20.19ms     | 27.11MB      | 739,794    | 0      |
| GET /middleware       | 11.01k  | 5.81ms      | 3.83ms | 18.85ms     | 30.86MB      | 880,431    | 0      |
| GET /headers          | 11.30k  | 5.64ms      | 3.61ms | 17.87ms     | 29.34MB      | 903,821    | 0      |
| GET /io               | 6.42k   | 10.04ms     | 6.37ms | 30.55ms     | 18.04MB      | 512,690    | 0      |
