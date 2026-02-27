# Framework Comparison Benchmark Report

> Generated: 2026-02-27 10:56:57
> CPU: Apple M2 Pro (8P + 4E cores)
> OS: darwin arm64 | Bun 1.3.10 (all frameworks run on Bun runtime)
> ulimit -n: unlimited (child processes raised to 10240)

## Light (-t2 -c50 -d10s)

### Req/Sec Comparison

| Endpoint | bun-server | express | nestjs |
| --- | --- | --- | --- |
| GET /ping | **31.41k** | 30.01k | 26.52k |
| GET /json | **28.22k** | 25.99k | 23.64k |
| GET /users/:id | **30.88k** | 29.91k | 25.62k |
| GET /search?q= | **29.96k** | 28.70k | 25.17k |
| POST /users | **27.65k** | 21.37k | 19.38k |
| POST /users/validated | **26.60k** | 21.28k | 18.93k |
| GET /middleware | **29.52k** | 28.57k | 24.69k |
| GET /headers | **30.98k** | 29.57k | 26.43k |
| GET /io | **21.37k** | 19.46k | 18.49k |

### Avg Latency Comparison

| Endpoint | bun-server | express | nestjs |
| --- | --- | --- | --- |
| GET /ping | 827.45us | 0.85ms | 0.98ms |
| GET /json | 0.89ms | 0.98ms | 1.08ms |
| GET /users/:id | 822.98us | 848.08us | 1.00ms |
| GET /search?q= | 841.76us | 0.89ms | 1.03ms |
| POST /users | 0.91ms | 1.20ms | 1.31ms |
| POST /users/validated | 0.95ms | 1.20ms | 1.36ms |
| GET /middleware | 0.86ms | 0.90ms | 1.03ms |
| GET /headers | 813.06us | 0.87ms | 0.97ms |
| GET /io | 1.18ms | 1.33ms | 1.37ms |

### Detailed Results

#### bun-server

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 31.41k | 827.45us | 543.02us | 1.88ms | 20.45MB | 625,382 | 0 |
| GET /json | 28.22k | 0.89ms | 179.82us | 1.72ms | 109.45MB | 567,429 | 0 |
| GET /users/:id | 30.88k | 822.98us | 309.39us | 1.66ms | 21.00MB | 617,833 | 0 |
| GET /search?q= | 29.96k | 841.76us | 218.83us | 1.66ms | 21.38MB | 602,140 | 0 |
| POST /users | 27.65k | 0.91ms | 177.62us | 1.74ms | 18.99MB | 555,715 | 0 |
| POST /users/validated | 26.60k | 0.95ms | 270.84us | 1.83ms | 19.54MB | 529,359 | 0 |
| GET /middleware | 29.52k | 0.86ms | 258.52us | 1.72ms | 20.78MB | 593,267 | 0 |
| GET /headers | 30.98k | 813.06us | 203.58us | 1.62ms | 20.17MB | 622,807 | 0 |
| GET /io | 21.37k | 1.18ms | 336.41us | 2.59ms | 15.04MB | 425,170 | 0 |

#### express

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 30.01k | 0.85ms | 362.92us | 1.89ms | 11.28MB | 603,150 | 0 |
| GET /json | 25.99k | 0.98ms | 288.27us | 1.98ms | 93.72MB | 522,420 | 0 |
| GET /users/:id | 29.91k | 848.08us | 278.10us | 1.73ms | 12.21MB | 598,464 | 0 |
| GET /search?q= | 28.70k | 0.89ms | 343.52us | 2.29ms | 12.64MB | 577,044 | 0 |
| POST /users | 21.37k | 1.20ms | 480.73us | 3.23ms | 8.84MB | 429,413 | 0 |
| POST /users/validated | 21.28k | 1.20ms | 380.27us | 2.59ms | 9.81MB | 423,499 | 0 |
| GET /middleware | 28.57k | 0.90ms | 341.97us | 2.17ms | 12.19MB | 571,236 | 0 |
| GET /headers | 29.57k | 0.87ms | 399.82us | 1.79ms | 10.55MB | 594,215 | 0 |
| GET /io | 19.46k | 1.33ms | 609.46us | 3.95ms | 8.38MB | 391,181 | 0 |

#### nestjs

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 26.52k | 0.98ms | 509.96us | 2.48ms | 9.96MB | 533,359 | 0 |
| GET /json | 23.64k | 1.08ms | 413.33us | 2.34ms | 84.81MB | 472,770 | 0 |
| GET /users/:id | 25.62k | 1.00ms | 375.24us | 2.00ms | 10.45MB | 512,439 | 0 |
| GET /search?q= | 25.17k | 1.03ms | 482.20us | 2.79ms | 11.08MB | 506,129 | 0 |
| POST /users | 19.38k | 1.31ms | 439.86us | 2.40ms | 8.20MB | 389,403 | 0 |
| POST /users/validated | 18.93k | 1.36ms | 586.88us | 3.05ms | 8.91MB | 380,623 | 0 |
| GET /middleware | 24.69k | 1.03ms | 390.50us | 2.09ms | 10.59MB | 496,300 | 0 |
| GET /headers | 26.43k | 0.97ms | 364.55us | 2.09ms | 9.43MB | 531,190 | 0 |
| GET /io | 18.49k | 1.37ms | 414.66us | 3.22ms | 7.97MB | 371,679 | 0 |

## Medium (-t4 -c200 -d10s)

### Req/Sec Comparison

| Endpoint | bun-server | express | nestjs |
| --- | --- | --- | --- |
| GET /ping | **15.82k** | 14.54k | 13.32k |
| GET /json | **13.98k** | 12.27k | 11.43k |
| GET /users/:id | **14.97k** | 14.30k | 12.40k |
| GET /search?q= | **14.66k** | 13.63k | 12.34k |
| POST /users | **13.50k** | 10.67k | 9.43k |
| POST /users/validated | **13.04k** | 10.33k | 9.29k |
| GET /middleware | **14.64k** | 13.40k | 11.94k |
| GET /headers | **14.99k** | 14.25k | 12.89k |
| GET /io | **10.53k** | 9.73k | 9.06k |

### Avg Latency Comparison

| Endpoint | bun-server | express | nestjs |
| --- | --- | --- | --- |
| GET /ping | 3.17ms | 3.54ms | 3.79ms |
| GET /json | 3.59ms | 4.11ms | 4.45ms |
| GET /users/:id | 3.35ms | 3.54ms | 4.08ms |
| GET /search?q= | 3.42ms | 3.72ms | 4.09ms |
| POST /users | 3.70ms | 4.73ms | 5.36ms |
| POST /users/validated | 3.86ms | 4.91ms | 5.52ms |
| GET /middleware | 3.42ms | 3.79ms | 4.24ms |
| GET /headers | 3.36ms | 3.54ms | 3.92ms |
| GET /io | 4.76ms | 5.18ms | 5.55ms |

### Detailed Results

#### bun-server

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 15.82k | 3.17ms | 310.40us | 3.93ms | 20.59MB | 635,908 | 0 |
| GET /json | 13.98k | 3.59ms | 407.80us | 4.50ms | 107.54MB | 557,636 | 0 |
| GET /users/:id | 14.97k | 3.35ms | 306.48us | 4.13ms | 20.45MB | 601,803 | 0 |
| GET /search?q= | 14.66k | 3.42ms | 319.85us | 4.23ms | 20.86MB | 587,601 | 0 |
| POST /users | 13.50k | 3.70ms | 347.69us | 4.61ms | 18.55MB | 537,560 | 0 |
| POST /users/validated | 13.04k | 3.86ms | 671.19us | 4.84ms | 19.15MB | 524,164 | 0 |
| GET /middleware | 14.64k | 3.42ms | 341.41us | 4.35ms | 20.62MB | 588,752 | 0 |
| GET /headers | 14.99k | 3.36ms | 584.51us | 4.23ms | 19.52MB | 602,665 | 0 |
| GET /io | 10.53k | 4.76ms | 518.66us | 6.02ms | 14.82MB | 419,483 | 0 |

#### express

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 14.54k | 3.54ms | 1.57ms | 9.14ms | 10.85MB | 580,621 | 0 |
| GET /json | 12.27k | 4.11ms | 846.23us | 6.43ms | 88.43MB | 493,119 | 0 |
| GET /users/:id | 14.30k | 3.54ms | 0.91ms | 6.71ms | 11.64MB | 570,952 | 0 |
| GET /search?q= | 13.63k | 3.72ms | 0.95ms | 7.67ms | 12.00MB | 542,914 | 0 |
| POST /users | 10.67k | 4.73ms | 1.01ms | 7.76ms | 8.83MB | 428,986 | 0 |
| POST /users/validated | 10.33k | 4.91ms | 1.28ms | 8.98ms | 9.50MB | 414,265 | 0 |
| GET /middleware | 13.40k | 3.79ms | 0.99ms | 8.33ms | 11.46MB | 537,128 | 0 |
| GET /headers | 14.25k | 3.54ms | 645.43us | 5.57ms | 10.17MB | 572,897 | 0 |
| GET /io | 9.73k | 5.18ms | 0.99ms | 8.50ms | 8.38MB | 387,694 | 0 |

#### nestjs

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 13.32k | 3.79ms | 0.87ms | 5.98ms | 10.01MB | 535,722 | 0 |
| GET /json | 11.43k | 4.45ms | 1.25ms | 10.11ms | 81.81MB | 456,055 | 0 |
| GET /users/:id | 12.40k | 4.08ms | 0.99ms | 6.87ms | 10.09MB | 494,800 | 0 |
| GET /search?q= | 12.34k | 4.09ms | 819.44us | 6.33ms | 10.86MB | 495,927 | 0 |
| POST /users | 9.43k | 5.36ms | 1.13ms | 9.14ms | 7.96MB | 378,217 | 0 |
| POST /users/validated | 9.29k | 5.52ms | 2.25ms | 9.85ms | 8.74MB | 370,398 | 0 |
| GET /middleware | 11.94k | 4.24ms | 1.04ms | 6.72ms | 10.24MB | 479,885 | 0 |
| GET /headers | 12.89k | 3.92ms | 844.49us | 6.31ms | 9.19MB | 518,101 | 0 |
| GET /io | 9.06k | 5.55ms | 1.02ms | 8.82ms | 7.80MB | 360,871 | 0 |

## Heavy (-t8 -c500 -d10s)

### Req/Sec Comparison

| Endpoint | bun-server | express | nestjs |
| --- | --- | --- | --- |
| GET /ping | **7.76k** | 7.04k | 6.49k |
| GET /json | **6.80k** | 6.21k | 5.61k |
| GET /users/:id | **7.43k** | 7.20k | 6.06k |
| GET /search?q= | **7.15k** | 7.01k | 6.06k |
| POST /users | **6.68k** | 5.23k | 4.54k |
| POST /users/validated | **6.58k** | 5.09k | 4.49k |
| GET /middleware | **7.35k** | 6.98k | 5.77k |
| GET /headers | **7.64k** | 7.28k | 6.23k |
| GET /io | **5.24k** | 4.80k | 4.34k |

### Avg Latency Comparison

| Endpoint | bun-server | express | nestjs |
| --- | --- | --- | --- |
| GET /ping | 8.00ms | 9.13ms | 9.59ms |
| GET /json | 9.13ms | 10.02ms | 11.08ms |
| GET /users/:id | 8.35ms | 8.60ms | 10.28ms |
| GET /search?q= | 8.67ms | 8.90ms | 10.27ms |
| POST /users | 9.28ms | 11.88ms | 13.70ms |
| POST /users/validated | 9.44ms | 12.22ms | 13.84ms |
| GET /middleware | 8.39ms | 8.92ms | 10.79ms |
| GET /headers | 8.13ms | 8.56ms | 9.98ms |
| GET /io | 11.84ms | 12.93ms | 14.32ms |

### Detailed Results

#### bun-server

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 7.76k | 8.00ms | 674.02us | 9.37ms | 20.19MB | 617,613 | 0 |
| GET /json | 6.80k | 9.13ms | 675.30us | 10.41ms | 105.07MB | 544,864 | 0 |
| GET /users/:id | 7.43k | 8.35ms | 832.21us | 9.62ms | 20.15MB | 593,166 | 0 |
| GET /search?q= | 7.15k | 8.67ms | 791.67us | 10.02ms | 20.29MB | 571,637 | 0 |
| POST /users | 6.68k | 9.28ms | 1.50ms | 10.70ms | 18.34MB | 531,548 | 0 |
| POST /users/validated | 6.58k | 9.44ms | 781.63us | 10.63ms | 19.20MB | 525,489 | 0 |
| GET /middleware | 7.35k | 8.39ms | 764.34us | 9.59ms | 20.71MB | 585,532 | 0 |
| GET /headers | 7.64k | 8.13ms | 646.01us | 9.44ms | 19.80MB | 611,694 | 0 |
| GET /io | 5.24k | 11.84ms | 1.08ms | 14.20ms | 14.75MB | 418,302 | 0 |

#### express

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 7.04k | 9.13ms | 4.59ms | 24.94ms | 10.56MB | 560,900 | 0 |
| GET /json | 6.21k | 10.02ms | 1.40ms | 12.96ms | 89.45MB | 498,838 | 0 |
| GET /users/:id | 7.20k | 8.60ms | 1.57ms | 12.56ms | 11.72MB | 574,953 | 0 |
| GET /search?q= | 7.01k | 8.90ms | 1.59ms | 13.88ms | 12.33MB | 557,609 | 0 |
| POST /users | 5.23k | 11.88ms | 1.70ms | 15.36ms | 8.63MB | 419,576 | 0 |
| POST /users/validated | 5.09k | 12.22ms | 1.88ms | 19.13ms | 9.38MB | 405,051 | 0 |
| GET /middleware | 6.98k | 8.92ms | 1.40ms | 14.38ms | 11.97MB | 555,793 | 0 |
| GET /headers | 7.28k | 8.56ms | 1.61ms | 12.30ms | 10.29MB | 580,000 | 0 |
| GET /io | 4.80k | 12.93ms | 2.46ms | 22.42ms | 8.26MB | 382,651 | 0 |

#### nestjs

| Endpoint | Req/Sec | Avg Latency | Stdev | P99 Latency | Transfer/sec | Total Reqs | Errors |
|----------|---------|-------------|-------|-------------|--------------|------------|--------|
| GET /ping | 6.49k | 9.59ms | 1.46ms | 13.61ms | 9.75MB | 521,792 | 0 |
| GET /json | 5.61k | 11.08ms | 1.64ms | 14.48ms | 80.91MB | 446,966 | 0 |
| GET /users/:id | 6.06k | 10.28ms | 1.87ms | 16.02ms | 9.87MB | 483,898 | 0 |
| GET /search?q= | 6.06k | 10.27ms | 1.69ms | 14.31ms | 10.62MB | 484,824 | 0 |
| POST /users | 4.54k | 13.70ms | 2.43ms | 23.16ms | 7.66MB | 364,060 | 0 |
| POST /users/validated | 4.49k | 13.84ms | 2.25ms | 23.23ms | 8.43MB | 360,212 | 0 |
| GET /middleware | 5.77k | 10.79ms | 1.91ms | 18.25ms | 9.89MB | 459,358 | 0 |
| GET /headers | 6.23k | 9.98ms | 1.37ms | 12.73ms | 8.89MB | 501,190 | 0 |
| GET /io | 4.34k | 14.32ms | 2.01ms | 20.23ms | 7.46MB | 345,698 | 0 |
