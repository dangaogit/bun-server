# 数据库（Database）

本页用于汇总 Bun Server Framework 的数据库相关文档入口。

## 核心数据库能力

- `DatabaseModule`：连接管理、健康检查、SQL 访问。
- ORM 支持：实体元数据、Repository、查询辅助能力。
- 事务支持：声明式事务边界与回滚处理。

## 推荐阅读

- [API 参考](./api.md)
- [最佳实践](./best-practices.md)
- [测试指南](./testing.md)
- [迁移指南](./migration.md)

## 常见接入步骤

1. 在根模块配置 `DatabaseModule.forRoot(...)`。
2. 按业务模块定义实体与仓储。
3. 多步骤写操作使用事务保证一致性。
4. 配置健康检查并监控连接池指标。
