# Changelog - v0.4.0

## 🎉 新功能

- ✨ 扩展错误码系统
  - 新增 30+ 错误码，覆盖数据库、文件、中间件、配置等场景
  - 统一错误码命名规范（模块_错误类型_具体错误）
  - 完善错误码分类（1000-8999）
  - 所有错误码都有对应的 HTTP 状态码映射
- ✨ 增强错误消息国际化支持
  - 支持消息模板系统（参数化消息，使用 {key} 占位符）
  - 新增日语（ja）和韩语（ko）支持
  - 改进语言检测机制（从 Accept-Language 头自动解析）
  - 支持手动设置全局语言
- ✨ 完善异常过滤器系统
  - HttpException 支持消息模板参数
  - 错误处理器自动应用国际化消息和模板参数
  - 改进异常过滤器执行机制

## 📝 改进

- ⚡ 改进错误处理器的国际化支持
  - 自动从请求头解析用户语言
  - 支持消息模板参数替换
- ⚡ 优化错误码系统
  - 更清晰的错误码分类和命名
  - 更完善的错误码文档

## 📊 测试

- ✅ 添加错误处理增强测试（15 个测试用例）
  - 错误码系统测试
  - 国际化功能测试
  - 异常过滤器测试
  - 消息模板参数测试
- ✅ 所有测试通过（15 个测试用例，359 个断言）

## 📚 文档

- 📝 添加错误处理指南（docs/error-handling.md）
  - 错误码系统说明
  - 国际化使用指南
  - 异常过滤器使用示例
  - 最佳实践和示例代码
  - 完整的错误码参考

---

**完整变更列表：**

- feat(error): enhance error handling system
  - extend error code system with 30+ new codes (database, file, middleware,
    config)
  - improve i18n support with message template system (parameterized messages)
  - add support for more languages (ja, ko) and improve language detection
  - update HttpException to support message template parameters
  - add comprehensive error handling documentation
  - add error handling tests (15 test cases, all passing)
