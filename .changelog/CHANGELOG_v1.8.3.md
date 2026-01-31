# Changelog - v1.8.3

## 🐛 修复

- 🔧 支持 `@Controller()` 与无参方法装饰器组合：`@GET()`、`@POST()` 等 path 参数改为可选（默认 `''`），映射到控制器基础路径或 `/`
- 🔧 `ControllerRegistry.combinePaths` 对 `methodPath` 做空值保护（`undefined` 视为 `''`），避免无参 `@GET()`/`@POST()` 注册时报错

## 📊 测试

- ✅ 新增 controller 路径组合场景测试（path-combination.test.ts）：验证 `@Controller()`/`@Controller('')` 与 `@GET('test')`、`@GET('/test')`、`@GET()`、`@GET('/')` 等组合均能正确匹配

---

**完整变更列表：**

- fix(router): support @Controller() with optional method path and path combination
- test(controller): add path combination scenarios a-e for root and empty path
