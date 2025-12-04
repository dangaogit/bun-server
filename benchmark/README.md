## Bun Server Benchmarks

基准测试位于 `benchmark/` 目录，可直接通过 Bun 执行。所有脚本基于
`src/testing/harness.ts` 中的 `PerformanceHarness` / `StressTester`，
输出结果为控制台表格，便于快速对比不同版本。

### 可用脚本

| 脚本              | 说明                                   |
| ----------------- | -------------------------------------- |
| `router.bench.ts` | 静态/动态路由匹配、handle、压力测试    |
| `di.bench.ts`     | 单例解析、嵌套依赖解析、工厂解析、并发 |

### 输出结果

脚本会打印两类信息：

- **Benchmark Results**：使用 `PerformanceHarness`
  的吞吐统计（迭代次数、耗时、ops/sec）
- **Stress Test**：使用 `StressTester`
  的并发执行结果（迭代次数、并发度、耗时、错误数）

如需新增其他基准，只需在 `benchmark/` 下创建新的 `.bench.ts` 文件并在
`package.json` 中添加对应脚本即可。
