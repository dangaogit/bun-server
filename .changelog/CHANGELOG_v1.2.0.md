# Changelog - v1.2.0

## 🎉 新功能

- ✨ 新增请求上下文全局访问：`ContextService`（基于 `AsyncLocalStorage`）
- ✨ 新增请求作用域依赖注入：支持 `Lifecycle.Scoped`
- ✨ 新增 `@Context()` 参数注入（主入口以 `ContextParam` 别名导出，避免与 `Context` 类冲突）

## 🐛 修复

- 🔧 修复主入口导出冲突：避免 `Context`（类）与 `@Context()`（装饰器）同名导致构建/运行失败
- 🔧 修复 `Container` 中不可达代码导致的 `tsc` 构建失败（TS7027）
- 🔧 优化测试端口选择，降低并发测试端口冲突概率

## 📝 改进

- ⚡ `Application.handleRequest` 使用 `AsyncLocalStorage` 包裹请求处理，保证中间件/控制器/服务层一致处于请求上下文

## 📊 测试

- ✅ 新增 `ContextService` 单元测试与并发隔离测试
- ✅ 新增 `@Context()` 装饰器集成测试
- ✅ 新增 `Lifecycle.Scoped` 测试

---

**完整变更列表：**

- feat(core): add ContextService with AsyncLocalStorage context store
- feat(controller): add @Context() parameter injection (exported as ContextParam)
- feat(di): add Lifecycle.Scoped with request-bound instance cache
- test: add coverage for context service, context decorator and scoped lifecycle
- fix(di): remove unreachable code to unblock build

