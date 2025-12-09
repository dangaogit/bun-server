# Changelog - v0.2.0

## 🎉 新功能

### 错误处理增强
- ✨ 添加错误码系统（ErrorCode）
  - 支持认证错误码（AUTH_REQUIRED, AUTH_INVALID_TOKEN, AUTH_INSUFFICIENT_PERMISSIONS）
  - 支持验证错误码（VALIDATION_FAILED, VALIDATION_REQUIRED_FIELD）
  - 支持 OAuth2 错误码（OAUTH2_INVALID_CLIENT, OAUTH2_INVALID_GRANT）
- ✨ 添加错误消息国际化支持
  - 支持英文（en）和中文（zh-CN）
  - 自动从 Accept-Language 头解析语言
  - HttpException 现在支持错误码参数

### 测试完善
- ✨ 添加 OAuth2 端到端测试（11 个测试用例）
  - 完整的授权码流程测试
  - 刷新令牌流程测试
  - 错误场景测试
- ✨ 添加 SecurityContext 并发测试（5 个测试用例）
  - 验证上下文隔离
  - 验证高并发场景下的线程安全

## 🐛 修复

- 🔧 修复 Bearer token 提取的大小写敏感问题（RFC 6750 合规）
- 🔧 修复 SecurityContext 上下文污染问题
- 🔧 修复 controller.ts 中的错误处理，统一使用 handleError
- 🔧 修复 SecurityModule 元数据清理问题

## 📝 改进

- ⚡ 改进 OAuth2AuthenticationProvider，从 JWT 令牌解析用户信息
- ⚡ 改进错误处理中间件，统一使用 handleError
- ⚡ 改进 SecurityModule，使用错误码

## 📊 测试

- ✅ 253 个测试全部通过
- ✅ 新增 17 个测试用例（OAuth2 E2E + SecurityContext 并发 + 错误码）

## 📦 依赖

- 无重大依赖变更

---

**完整变更列表：**
- feat(error): add error code system and i18n support
- feat(security): add concurrent tests for SecurityContext thread safety
- feat(security): add OAuth2 E2E tests and fix authentication issues
