# Changelog - v1.0.0

## 🎉 新功能

- ✨ CacheModule（缓存模块）
  - 支持内存缓存和 Redis 缓存
  - 提供 @Cacheable、@CacheEvict、@CachePut 装饰器
  - 支持 TTL 配置和命名空间
- ✨ QueueModule（队列模块）
  - 支持内存队列和 Redis 队列
  - 提供 @Queue 装饰器用于异步任务处理
  - 提供 @Cron 装饰器用于定时任务
  - 支持任务重试和优先级
- ✨ SessionModule（会话模块）
  - 支持基于 Cookie 的会话管理
  - 提供 @Session 装饰器用于会话注入
  - 支持会话过期和自动清理
- ✨ DatabaseModule 增强
  - 添加 PostgreSQL/MySQL 集成测试支持
  - 添加数据库连接测试工具（examples/database-test-app.ts）
  - 支持环境变量配置（POSTGRES_URL, MYSQL_URL）

## 🐛 修复

- 🔧 修复 SessionModule 中间件和参数绑定问题
- 🔧 修复路由匹配缓存中的类型导入问题

## 📝 改进

- ⚡ 路由匹配性能优化
  - 添加路由匹配结果缓存，避免重复匹配
  - 优化 preHandle 和 handle 方法，减少重复匹配
  - 注册新路由时自动清除缓存
- ⚡ 中间件管道性能优化
  - 优化链式调用创建方式，使用递归函数替代数组
  - 减少内存分配，提升大量中间件场景的性能
- ⚡ DI 容器优化
  - 依赖计划缓存机制已完善
  - 单例缓存机制正常工作

## 📊 测试

- ✅ 添加数据库集成测试（PostgreSQL/MySQL）
  - 支持环境变量配置，自动跳过未配置的数据库测试
  - 包含连接、查询、事务、健康检查测试
- ✅ 添加核心模块边界测试
  - DI Container 边界测试（未注册依赖、循环依赖等）
  - Router 边界测试（空路径、特殊字符、查询字符串等）
  - Middleware Pipeline 边界测试（错误处理、空管道等）
  - Context 边界测试（无效 URL、特殊字符等）
- ✅ 添加性能优化验证测试
  - 路由匹配缓存性能验证
  - 中间件管道优化验证
  - DI 容器依赖计划缓存验证
  - 大量路由和中间件处理性能测试
- ✅ 添加 Cache、Queue、Session 模块的全面测试
- ✅ 所有测试通过（434 个测试用例，426 个通过，8 个跳过）

## 📚 文档

- 📝 文档全面英文化
  - API 文档（docs/api.md）完整更新
  - 使用指南（docs/guide.md）完整更新
  - 添加故障排查指南
  - 添加生产部署指南
  - 添加性能调优指南
- 📝 完善 API 文档
  - 添加 Database Module API 文档
  - 添加 Cache Module API 文档
  - 添加 Queue Module API 文档
  - 添加 Session Module API 文档
  - 添加 Health Module API 文档
  - 添加 Metrics Module API 文档
  - 添加 Security Module API 文档
- 📝 完善使用指南
  - 添加数据库集成使用示例
  - 添加缓存使用示例
  - 添加队列使用示例
  - 添加会话管理使用示例
  - 添加健康检查使用示例
  - 添加指标收集使用示例
  - 添加安全认证使用示例

## 🎯 v1.0.0 里程碑

v1.0.0 是 Bun Server Framework 的第一个稳定版本（Stable
Release），标志着框架已经具备企业级应用所需的核心能力：

- ✅ **完整的数据库集成**：支持 PostgreSQL、MySQL、SQLite，提供 ORM
  集成和事务支持
- ✅ **生产就绪**：完善的测试覆盖（434 个测试用例）、完整的文档、性能优化
- ✅ **API 稳定性**：确保 API 向后兼容，为后续版本奠定基础
- ✅ **丰富的功能模块**：Cache、Queue、Session、Health、Metrics、Security
  等官方模块

---

**完整变更列表：**

- feat(cache/queue/session): add CacheModule, QueueModule and SessionModule
- feat(examples): add database connection test tool
- feat(router): optimize route matching with result cache
- feat(middleware): optimize middleware pipeline execution
- test: add database integration tests and edge case tests
- test(perf): add performance optimization verification tests
- docs: switch primary documentation to English
- docs: add troubleshooting, deployment, and performance guides
- docs: enhance API documentation and usage guide
- fix(session): fix session middleware and parameter binding
- fix(router): add missing RouteMatch type import
