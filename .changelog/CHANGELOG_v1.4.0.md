# Changelog - v1.4.0

## 🎉 新功能

- ✨ 微服务架构支持
  - ✨ 配置中心抽象接口和 Nacos 实现
  - ✨ 服务注册与发现抽象接口和 Nacos 实现
  - ✨ 服务调用客户端（ServiceClient）支持负载均衡、重试、熔断、限流
  - ✨ 服务治理（熔断器、限流器、重试策略）
  - ✨ 分布式追踪支持
  - ✨ 服务监控指标收集
- ✨ Nacos 3.X Open API 客户端（@dangao/nacos-client）
- ✨ 装饰器支持
  - ✨ `@ConfigCenterValue()` 配置值注入装饰器
  - ✨ `@NacosValue()` Nacos 特定配置值注入装饰器
  - ✨ `@ServiceRegistry()` 服务自动注册装饰器
  - ✨ `@ServiceDiscovery()` 服务自动发现装饰器
  - ✨ `@ServiceClient()` ServiceClient 注入装饰器
  - ✨ `@ServiceCall()` 服务调用方法标记装饰器
  - ✨ `@CircuitBreaker()` 熔断器装饰器
- ✨ ConfigModule 深度集成
  - ✨ 支持配置中心作为配置源
  - ✨ 配置变更自动刷新
  - ✨ 配置优先级管理
- ✨ Application 生命周期集成
  - ✨ 应用启动时自动服务注册
  - ✨ 应用关闭时自动服务注销
  - ✨ 健康检查与服务注册集成
- ✨ MetricsModule 集成
  - ✨ 服务调用指标自动上报
  - ✨ Prometheus 格式导出支持
- ✨ 分布式限流（Redis 支持）
- ✨ 流式调用支持（Server-Sent Events）

## 🐛 修复

- 🔧 修复 Nacos API 响应解析问题（getConfig 和 getInstances）
- 🔧 修复 CircuitBreaker getState() 方法缺失问题
- 🔧 修复 ServiceClient executeRequest 方法中 ServiceInstance 类型问题
- 🔧 修复 ConfigModule setValueByPath 方法中 null 值处理问题（typeof null === 'object'）
- 🔧 修复类型导出问题（verbatimModuleSyntax 兼容性）

## 📝 改进

- ⚡ 优化配置中心配置加载性能
- ⚡ 优化服务发现缓存机制
- ⚡ 改进错误处理和日志输出

## 📊 测试

- ✅ 43 个微服务模块单元测试全部通过
- ✅ ConfigCenter 接口 Mock 测试
- ✅ ServiceRegistry 接口 Mock 测试
- ✅ ServiceClient 单元测试
- ✅ 负载均衡器单元测试（5 种策略）
- ✅ 熔断器单元测试
- ✅ 限流器单元测试
- ✅ 重试策略单元测试
- ✅ 追踪器单元测试
- ✅ 监控收集器单元测试

## 📚 文档

- 📖 微服务使用指南（docs/microservice.md）
- 📖 配置中心使用指南（docs/microservice-config-center.md）
- 📖 服务注册与发现使用指南（docs/microservice-service-registry.md）
- 📖 Nacos 集成文档（docs/microservice-nacos.md）

---

**完整变更列表：**

- feat(microservice): add microservice architecture support
- feat(config-center): add ConfigCenter abstraction and Nacos implementation
- feat(service-registry): add ServiceRegistry abstraction and Nacos implementation
- feat(service-client): add ServiceClient with load balancing, retry, circuit breaker, rate limiting
- feat(governance): add CircuitBreaker, RateLimiter, RetryStrategy
- feat(tracing): add distributed tracing support
- feat(monitoring): add service metrics collection
- feat(nacos-client): add Nacos 3.X Open API client package
- feat(decorators): add @ConfigCenterValue, @ServiceRegistry, @ServiceClient, @CircuitBreaker decorators
- feat(config): integrate ConfigModule with ConfigCenter
- feat(application): integrate service registration with Application lifecycle
- feat(metrics): integrate service metrics with MetricsModule
- feat(governance): add Redis-based distributed rate limiting
- feat(service-client): add stream call support
- fix(nacos-client): fix API response parsing for getConfig and getInstances
- fix(governance): add getState() method to CircuitBreaker
- fix(service-client): fix ServiceInstance type in executeRequest method
- fix(config): fix setValueByPath null handling (typeof null === 'object')
- fix(types): fix type exports for verbatimModuleSyntax compatibility
- test(microservice): add comprehensive unit tests (43 tests)
- test(config): add setValueByPath null handling test
- docs(microservice): add microservice usage guides

