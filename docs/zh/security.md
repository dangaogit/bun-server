# 安全（Security）

本页用于汇总 Bun Server Framework 的安全相关文档入口。

## 核心安全能力

- `SecurityModule`：认证流程、鉴权检查、Guard 集成。
- `auth` 模块：JWT/OAuth2 提供器与令牌处理能力。
- Guards：路由级访问控制与角色校验。

## 推荐阅读

- [API 参考](./api.md)
- [Guards](./guards.md)
- [最佳实践](./best-practices.md)
- [错误处理](./error-handling.md)

## 常见接入步骤

1. 在根模块配置 `SecurityModule.forRoot(...)`。
2. 在受保护路由上使用 `@Auth()` 或 Guard。
3. 密钥放入环境变量，不要写入源码。
4. 对敏感接口开启请求日志与限流。
