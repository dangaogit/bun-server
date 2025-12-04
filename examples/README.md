# 示例项目

| 文件 | 说明 | 运行方式 |
| --- | --- | --- |
| `basic-app.ts` | 最小可运行示例，包含 DI、控制器与验证 | `bun run examples/basic-app.ts` |
| `full-app.ts` | 综合示例，集成日志、CORS、上传、静态资源与 WebSocket | `bun run examples/full-app.ts` |
| `perf/app.ts` | 性能压测示例，暴露 `/api/ping` 供 wrk 等工具测试 | `bun run examples/perf/app.ts` |

> 运行前请确保 `bun install` 已完成依赖安装。示例默认监听 3100/3200/3300 端口，可通过设置 `PORT` 环境变量覆盖（例如 `PORT=0 bun run ...` 交由系统分配端口）。

## 常用命令

```bash
# 基础示例
bun run examples/basic-app.ts

# 全功能示例
bun run examples/full-app.ts

# 性能测试
bun run examples/perf/app.ts
wrk -t4 -c64 -d30s http://localhost:3300/api/ping
```

所有示例都会在控制台输出服务地址，按需调整端口或中间件配置即可。

