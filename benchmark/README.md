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
覆盖框架核心路径（JSON 响应、路由参数、Body 解析、验证、中间件链等）。

**前置条件**：系统需安装 wrk（`brew install wrk` / `apt install wrk`）。

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

运行方式：

```bash
bun benchmark/run-wrk.ts
```

脚本会自动启动测试服务器、依次运行 wrk、解析结果并生成
`benchmark/REPORT.md` 报告文件。

默认参数：`-t2 -c50 -d10s`（2 线程、50 并发连接、持续 10 秒）。

### 添加新基准

在 `benchmark/` 下创建新的 `.bench.ts` 文件并在 `package.json` 中添加对应脚本即可。
