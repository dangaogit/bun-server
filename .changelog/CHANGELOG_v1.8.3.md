# Changelog - v1.8.3

## 🐛 修复

- 🔧 支持 `@Controller()` 与无参方法装饰器组合：`@GET()`、`@POST()` 等 path
  参数改为可选（默认 `''`），映射到控制器基础路径或 `/`
- 🔧 `ControllerRegistry.combinePaths` 对 `methodPath` 做空值保护（`undefined`
  视为 `''`），避免无参 `@GET()`/`@POST()` 注册时报错

## 📝 改进

- ⚡ 关键流程增加 debug 日志：请求入口、路由匹配/未匹配、执行
  handler、错误处理（含 routeHandler/stack）、控制器抛错、4xx/5xx 响应；开启
  logger debug 后可定位 500 等问题的控制器、方法和堆栈

## 📊 测试

- ✅ 新增 controller 路径组合场景测试（path-combination.test.ts）：验证
  `@Controller()`/`@Controller('')` 与
  `@GET('test')`、`@GET('/test')`、`@GET()`、`@GET('/')` 等组合均能正确匹配

---

**完整变更列表：**

- fix(router): support @Controller() with optional method path and path
  combination
- test(controller): add path combination scenarios a-e for root and empty path
- feat(logging): add debug logs across request lifecycle for troubleshooting
