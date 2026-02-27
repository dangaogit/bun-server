# HTTP Benchmark Report

> Generated: 2026-02-27 10:08:30 CPU: Intel(R) Core(TM) i7-9750H CPU @ 2.60GHz
> (12 cores) OS: linux x64 | Bun 1.3.10 | @dangao/bun-server 1.9.0 ulimit -n:
> 524288 (child processes raised to 10240)

## Light (-t2 -c50 -d10s)

| Endpoint              | Req/Sec | Avg Latency | Stdev    | P99 Latency | Transfer/sec | Total Reqs | Errors |
| --------------------- | ------- | ----------- | -------- | ----------- | ------------ | ---------- | ------ |
| GET /ping             | 17.69k  | 1.42ms      | 250.48us | 2.35ms      | 11.46MB      | 353,724    | 0      |
| GET /json             | 15.39k  | 1.63ms      | 297.28us | 2.65ms      | 59.39MB      | 307,878    | 0      |
| GET /users/:id        | 15.55k  | 1.62ms      | 326.23us | 2.72ms      | 10.62MB      | 312,502    | 0      |
| GET /search?q=        | 15.96k  | 1.57ms      | 247.83us | 2.53ms      | 11.39MB      | 317,535    | 0      |
| POST /users           | 13.21k  | 1.90ms      | 339.55us | 2.99ms      | 9.03MB       | 264,139    | 0      |
| POST /users/validated | 13.20k  | 1.90ms      | 214.04us | 2.60ms      | 9.70MB       | 262,785    | 0      |
| GET /middleware       | 15.41k  | 1.63ms      | 305.45us | 2.69ms      | 10.85MB      | 309,732    | 0      |
| GET /headers          | 16.90k  | 1.48ms      | 231.19us | 2.57ms      | 11.00MB      | 336,338    | 0      |
| GET /io               | 13.03k  | 1.93ms      | 548.65us | 3.95ms      | 9.17MB       | 259,406    | 0      |

## Medium (-t4 -c200 -d10s)

| Endpoint              | Req/Sec | Avg Latency | Stdev    | P99 Latency | Transfer/sec | Total Reqs | Errors |
| --------------------- | ------- | ----------- | -------- | ----------- | ------------ | ---------- | ------ |
| GET /ping             | 7.66k   | 6.56ms      | 795.30us | 8.11ms      | 9.94MB       | 304,709    | 0      |
| GET /json             | 7.04k   | 7.14ms      | 826.44us | 9.52ms      | 54.44MB      | 280,097    | 0      |
| GET /users/:id        | 7.33k   | 6.85ms      | 822.11us | 8.93ms      | 10.00MB      | 291,993    | 0      |
| GET /search?q=        | 6.69k   | 7.51ms      | 749.85us | 9.22ms      | 9.52MB       | 266,308    | 0      |
| POST /users           | 5.69k   | 8.83ms      | 762.60us | 10.24ms     | 7.79MB       | 226,513    | 0      |
| POST /users/validated | 5.82k   | 8.64ms      | 0.87ms   | 10.64ms     | 8.52MB       | 231,551    | 0      |
| GET /middleware       | 7.34k   | 6.84ms      | 625.26us | 8.47ms      | 10.30MB      | 292,062    | 0      |
| GET /headers          | 7.97k   | 6.30ms      | 419.27us | 7.50ms      | 10.36MB      | 317,314    | 0      |
| GET /io               | 6.01k   | 8.35ms      | 1.09ms   | 10.97ms     | 8.44MB       | 239,245    | 0      |

## Heavy (-t8 -c500 -d10s)

| Endpoint              | Req/Sec | Avg Latency | Stdev  | P99 Latency | Transfer/sec | Total Reqs | Errors |
| --------------------- | ------- | ----------- | ------ | ----------- | ------------ | ---------- | ------ |
| GET /ping             | 4.17k   | 14.91ms     | 0.93ms | 17.21ms     | 10.84MB      | 332,460    | 0      |
| GET /json             | 3.61k   | 17.22ms     | 1.24ms | 19.64ms     | 55.83MB      | 287,748    | 0      |
| GET /users/:id        | 3.68k   | 16.90ms     | 0.90ms | 19.11ms     | 10.04MB      | 293,244    | 0      |
| GET /search?q=        | 3.82k   | 16.30ms     | 0.89ms | 18.12ms     | 10.87MB      | 304,123    | 0      |
| POST /users           | 3.27k   | 19.03ms     | 1.36ms | 21.70ms     | 8.97MB       | 260,348    | 0      |
| POST /users/validated | 3.13k   | 19.86ms     | 1.37ms | 22.32ms     | 9.19MB       | 249,547    | 0      |
| GET /middleware       | 3.86k   | 16.13ms     | 0.91ms | 18.30ms     | 10.83MB      | 307,348    | 0      |
| GET /headers          | 3.28k   | 19.00ms     | 1.15ms | 21.27ms     | 8.51MB       | 260,822    | 0      |
| GET /io               | 3.19k   | 19.53ms     | 2.18ms | 24.83ms     | 8.95MB       | 253,722    | 0      |
