# Changelog - v1.7.1

## 🐛 修复

- 🔧 修复路由路径组合问题：当 `@Controller('/')` 与 `@GET('/health')` 组合时，生成的路径是 `//health` 而不是 `/health`
- 🔧 修复 `database-app.ts` 示例的模块导入和懒初始化
- 🔧 修复 `orm-app.ts` 示例的模块导入和懒初始化
- 🔧 修复 `transaction-app.ts` 示例的模块导入和懒初始化

## 🎉 新功能

- ✨ 实现 `@Cacheable`, `@CacheEvict`, `@CachePut` 装饰器
- ✨ 添加 `@EnableCacheProxy()` 装饰器用于启用服务层缓存代理
- ✨ 添加 `CacheServiceProxy` 用于创建缓存代理
- ✨ 添加 `InstancePostProcessor` 接口用于 DI 容器实例后处理

## 📝 改进

- ⚡ 改进路径规范化处理，支持多种边界情况：
  - `[/ + /api/base]` → `/api/base`
  - `[// + /api/base]` → `/api/base`
  - `[/api + /base]` → `/api/base`
  - `[/api/ + base]` → `/api/base`
  - `[/api/base + ""]` → `/api/base`
- ⚡ 添加微服务示例的用户测试引导日志

## 📊 测试

- ✅ 添加路径规范化测试用例（19 个测试）
- ✅ 添加缓存装饰器测试用例
- ✅ 所有 630 个测试通过

---

**完整变更列表：**

- feat(cache): implement @Cacheable, @CacheEvict, @CachePut decorators
- fix(router): fix path combination when controller base path is "/"
- refactor(router): improve path normalization for edge cases
- fix(examples): fix database-app.ts module imports and lazy initialization
- fix(examples): fix orm-app.ts module imports and lazy initialization
- fix(examples): fix transaction-app.ts module imports and lazy initialization
- docs(examples): add user guide logs to microservice-app.ts
