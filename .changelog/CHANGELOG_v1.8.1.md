# Changelog - v1.8.1

## 📊 测试

- ✅ 添加 auth 模块测试：auth-decorators.test.ts, oauth2-service.test.ts
- ✅ 添加 cache 模块测试：cache-decorators-extended.test.ts, cache-interceptors.test.ts, cache-service-proxy.test.ts, memory-cache-store.test.ts, redis-cache-store.test.ts
- ✅ 添加 config 模块测试：config-center-integration.test.ts, config-module-extended.test.ts
- ✅ 添加 controller 模块测试：param-binder.test.ts
- ✅ 扩展 error 模块测试：error-handler.test.ts, i18n-extended.test.ts
- ✅ 添加 events 模块测试：event-listener-scanner.test.ts，重构 event-module.test.ts
- ✅ 添加 extensions 模块测试：logger-module.test.ts
- ✅ 添加 files 模块测试：file-storage.test.ts
- ✅ 添加 interceptor 模块测试：base-interceptor.test.ts, cache-interceptor.test.ts, log-interceptor.test.ts, permission-interceptor.test.ts, interceptor-chain.test.ts, interceptor-metadata.test.ts
- ✅ 添加 microservice 模块测试：circuit-breaker.test.ts, service-client-decorators.test.ts, service-client-interceptors.test.ts, service-registry-decorators.test.ts, tracer.test.ts, tracing-collectors.test.ts
- ✅ 添加 middleware 模块测试：middleware-builtin-extended.test.ts, rate-limit.test.ts, middleware-decorators.test.ts, middleware-pipeline.test.ts
- ✅ 添加 queue 模块测试：queue-decorators.test.ts, queue-service.test.ts
- ✅ 添加 request 模块测试：body-parser-extended.test.ts, request-wrapper.test.ts
- ✅ 添加 router 模块测试：router-decorators.test.ts, router-extended.test.ts
- ✅ 添加 security 模块测试：reflector.test.ts, security-filter.test.ts, security-module-extended.test.ts
- ✅ 添加 session 模块测试：memory-session-store.test.ts, session-decorators.test.ts
- ✅ 添加 swagger 模块测试：ui.test.ts

## 🐛 修复

- 🔧 修复 file-storage 测试不稳定问题，使用唯一文件名避免并行测试冲突

## 📦 新增文件

### 配置
- `bunfig.toml` - Bun 配置文件

### 测试文件
- 45 个新增或重构的测试文件，覆盖 auth, cache, config, controller, error, events, extensions, files, interceptor, microservice, middleware, queue, request, router, security, session, swagger 模块

---

**完整变更列表：**

- test: add comprehensive test coverage for multiple modules (#17)
