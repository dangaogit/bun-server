# Changelog - v1.1.0

## 🎉 新功能

- ✨ 实现通用拦截器机制（Interceptor System）
  - 提供 `Interceptor` 接口和 `InterceptorRegistry` 中央注册表
  - 支持自定义装饰器和拦截器无缝集成
  - 支持拦截器优先级排序和执行链

- ✨ 实现拦截器链支持（Interceptor Chain）
  - `InterceptorChain` 支持多个拦截器链式调用
  - 支持跨元数据键的优先级排序
  - 支持拦截器修改参数和返回值

- ✨ 提供拦截器基类（BaseInterceptor）
  - `BaseInterceptor` 抽象基类简化自定义拦截器开发
  - 提供便捷的元数据查找方法（支持原型链查找）
  - 提供容器和上下文访问方法

- ✨ 内置拦截器
  - `@Cache(options)` - 方法结果缓存拦截器
  - `@Permission(options)` - 权限检查拦截器
  - `@Log(options)` - 日志记录拦截器

- ✨ 重构事务拦截器
  - `TransactionInterceptor` 重构为使用通用拦截器机制
  - 保持向后兼容性

- ✨ 完善文档和示例
  - 添加自定义装饰器开发指南（中英文）
  - 添加基础示例（custom-decorator-app.ts）
  - 添加高级示例（advanced-decorator-app.ts）

## 🐛 修复

- 🔧 修复路由装饰器重复注册问题
  - 限制 `@GET`、`@POST` 等装饰器只能在 `@Controller` 中使用
  - 修复装饰器应用顺序导致的重复路由注册

- 🔧 修复拦截器元数据查找问题
  - 修复 `BaseInterceptor.getMetadata()` 支持原型链查找
  - 修复 `getTransactionMetadata()` 支持原型链查找
  - 修复示例代码中的元数据查找问题

- 🔧 修复拦截器链类型一致性问题
  - 修复 `InterceptorChain` 中 `wrappedNext` 的类型签名
  - 保持 `T | Promise<T>` 类型一致性

- 🔧 修复 prototype 变量作用域问题
  - 修复 `ControllerRegistry` 中 `prototype` 变量作用域

- 🔧 修复拦截器参数修改支持
  - 修复 `InterceptorChain` 正确传递修改后的参数

## 📝 改进

- ⚡ 统一 Constructor 类型使用
  - 统一使用 `Constructor<T>` 类型替代内联构造函数类型
  - 提升代码一致性和可维护性

- ⚡ 完善测试覆盖
  - 添加拦截器注册表测试
  - 添加拦截器链测试
  - 添加拦截器集成测试
  - 添加高级集成测试
  - 添加性能测试
  - 添加参数修改测试
  - 总计 51 个测试全部通过

- ⚡ 更新提交规范
  - 添加英文提交信息要求
  - 保持代码库国际化标准

## 📊 测试

- ✅ 51 个测试全部通过
- ✅ 拦截器性能测试通过（开销在可接受范围内）
- ✅ 集成测试覆盖复杂场景

---

**完整变更列表：**

- feat(interceptor): implement generic interceptor mechanism and interceptor chain support
- test(interceptor): add interceptor performance tests
- test(interceptor): add advanced integration tests
- fix(interceptor): fix encapsulation violation and argument modification support
- fix(interceptor): fix prototype chain lookup and type consistency issues
- fix(router): prevent duplicate route registration and restrict decorators to @Controller
- refactor(router): remove temporary debug statements from route matching
- docs(commit): add English-only requirement to commit guidelines
- docs(roadmap): update v1.1.x completion status

