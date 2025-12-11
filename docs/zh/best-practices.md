# 最佳实践

## 架构与模块化

- **按领域拆分**：每个业务域单独的 Controller + Service + DTO，更易维护与测试。
- **依赖显式化**：所有服务都通过构造函数注入，避免在方法内部 `container.resolve`。
- **清理全局状态**：测试环境中记得清空 `RouteRegistry`、`ControllerRegistry` 与文件级缓存。

## 中间件策略

- **全局 vs 局部**：跨路由逻辑（日志、错误处理、鉴权）使用 `app.use`；业务相关逻辑在控制器上使用 `@UseMiddleware`。
- **保持幂等**：中间件应尽量避免修改共享状态，可通过 `context` 新增字段传递数据。
- **避免重复解析**：`Context.getBody()` 已缓存结果，不要在中间件和控制器中重复 `await request.json()`。

## 性能建议

- **缓存配置**：频繁读取的配置或数据可使用 Singleton 服务缓存。
- **路由顺序**：将高频路由优先注册，减少匹配遍历时间。
- **WebSocket**：处理长连接时避免阻塞操作，可将耗时任务交给队列或其他线程。

## 安全

- **输入验证**：所有外部输入（Body/Query/Param）都应使用验证装饰器或手动校验。
- **静态文件**：使用内置 `createStaticFileMiddleware` 可自动阻止路径穿越。
- **文件上传**：限制文件大小与类型，必要时结合病毒扫描或内容审核。

## 日志与监控

- **结构化日志**：`createLoggerMiddleware` 支持自定义 logger，可统一输出 JSON 格式，方便集中收集。
- **请求追踪**：在中间件中注入 trace-id 到 `Context`，贯穿后续日志与下游调用。
- **指标**：结合 `createRequestLoggingMiddleware` 或自定义中间件统计响应时间，供性能优化参考。

## 部署

- **多实例**：Bun 进程可结合容器/PM2 等方式多实例部署，并在外层做负载均衡。
- **可观测**：建议接入健康检查路由（GET `/health`）以及基础指标导出（如 Prometheus）。
- **灰度发布**：合理配置中间件，使得灰度流量可按 Header/Token 进行分流。

