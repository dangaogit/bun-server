## Bun Server Benchmarks

基准测试位于 `benchmark/` 目录，可直接通过 Bun 执行。

### 内部微基准

基于 `src/testing/harness.ts` 中的 `PerformanceHarness` / `StressTester`，
输出结果为控制台表格，便于快速对比不同版本。

| 脚本              | 说明                                   |
| ----------------- | -------------------------------------- |
| `router.bench.ts` | 静态/动态路由匹配、handle、压力测试    |
| `di.bench.ts`     | 单例解析、嵌套依赖解析、工厂解析、并发 |

```bash
bun benchmark/router.bench.ts
bun benchmark/di.bench.ts
```

### HTTP 端到端基准（wrk）

使用 [wrk](https://github.com/wg/wrk) 对真实 HTTP 端点进行压测，
覆盖框架核心路径（JSON 响应、路由参数、Body 解析、验证、中间件链、文件 I/O 等）。

**前置条件**：

- 系统需安装 wrk（`brew install wrk` / `apt install wrk`）
- 脚本自动为子进程提升 `ulimit -n` 至 10240（macOS 默认 256 不够用），无需手动调整

| 端点                    | 类型        | 测试目标         |
| ----------------------- | ----------- | ---------------- |
| `GET /ping`             | 最简 JSON   | 框架基线开销     |
| `GET /json`             | 较大 JSON   | JSON 序列化性能  |
| `GET /users/:id`        | 路径参数    | 参数解析         |
| `GET /search?q=xxx`     | 查询参数    | Query 解析       |
| `POST /users`           | JSON Body   | Body 解析        |
| `POST /users/validated` | Body + 验证 | 验证管道开销     |
| `GET /middleware`        | 中间件链    | 多中间件叠加开销 |
| `GET /headers`          | Header 读写 | Header 处理      |
| `GET /io`               | 文件 I/O   | 真实业务负载     |

#### 单进程基准

```bash
bun benchmark/run-wrk.ts
```

自动启动单个测试服务器，按三个梯度依次运行 wrk，输出 `benchmark/REPORT.md`。

| 梯度   | 线程 | 并发连接 | 持续时间 |
| ------ | ---- | -------- | -------- |
| Light  | 2    | 50       | 10s      |
| Medium | 4    | 200      | 10s      |
| Heavy  | 8    | 500      | 10s      |

#### 多进程基准（reusePort, Linux only）

```bash
bun benchmark/run-wrk-cluster.ts
# 自定义 worker 数量：
WORKERS=4 bun benchmark/run-wrk-cluster.ts
```

启动 N 个 worker 进程（默认 = CPU 核心数），每个进程以 `reusePort: true`
绑定同一端口，内核负责连接级负载均衡。输出 `benchmark/REPORT_CLUSTER.md`。

> **注意**：`SO_REUSEPORT` 仅 Linux 有效。macOS/Windows 会静默忽略该选项，
> 多个 worker 中只有第一个能成功绑定端口。

### 框架对比基准（bun-server vs Express vs NestJS）

使用 wrk 对三个框架的相同端点进行压测对比，所有框架均运行在 Bun runtime 上，
以隔离框架本身的开销差异。

```bash
bun benchmark/run-wrk-compare.ts

# 仅运行 Light 梯度:
TIER=0 bun benchmark/run-wrk-compare.ts

# 仅运行 Medium 梯度:
TIER=1 bun benchmark/run-wrk-compare.ts
```

自动按顺序启动 bun-server、Express、NestJS 测试服务器，对每个框架执行相同的
wrk 压测，生成对比报告 `benchmark/REPORT_COMPARE.md`。

| 框架       | 服务器脚本             | 说明                          |
| ---------- | ---------------------- | ----------------------------- |
| bun-server | `wrk-server.ts`        | 本框架（装饰器 + DI + 中间件） |
| Express    | `wrk-server-express.ts`| Express 5，手动路由            |
| NestJS     | `wrk-server-nestjs.ts` | NestJS 11，装饰器控制器        |

报告包含：
- **Req/Sec 对比表**（最高值加粗）
- **Avg Latency 对比表**
- 每个框架的详细结果（延迟分布、P99、错误数等）

### 报告文件索引

| 报告文件 | 说明 | 生成命令 |
| --- | --- | --- |
| [`REPORT.md`](./REPORT.md) | bun-server 单框架基准（macOS） | `bun benchmark/run-wrk.ts` |
| [`REPORT_COMPARE.md`](./REPORT_COMPARE.md) | 框架对比（bun-server / Express / NestJS） | `bun benchmark/run-wrk-compare.ts` |
| [`REPORT_LINUX.md`](./REPORT_LINUX.md) | bun-server 单框架基准（Linux） | Linux 上运行 `run-wrk.ts` |
| [`REPORT_LINUX_CLUSTER.md`](./REPORT_LINUX_CLUSTER.md) | 多进程 reusePort 基准（Linux） | Linux 上运行 `run-wrk-cluster.ts` |

### 添加新基准

在 `benchmark/` 下创建新的 `.bench.ts` 文件并在 `package.json` 中添加对应脚本即可。
