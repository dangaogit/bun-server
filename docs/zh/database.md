# 数据库（Database）

数据库模块 V2 基于原生 `Bun.SQL` 实现，并提供请求级连接策略控制。

## V2 关键能力

- 原生 Bun.SQL 连接池参数透传（不重复造物理连接池）
- 推荐统一入口：`import { db } from '@dangao/bun-server'`
- 路由级策略：`@DbStrategy('pool' | 'session')` / `@DbSession()`
- session 策略：首次查询惰性 `reserve()` + ALS 请求上下文绑定
- `db.transaction()` 与 `@Transactional()` 统一事务路径
- SQLite 增强：默认 `WAL` + 写并发保护

## 配置示例

```ts
DatabaseModule.forRoot({
  type: 'postgres',
  url: process.env.DB_URL!,
  bunSqlPool: {
    max: 20,
    idleTimeout: 30,
  },
  defaultStrategy: 'pool',
});
```

## 路由策略示例

```ts
import { Controller, GET, POST, db, DbSession } from '@dangao/bun-server';

@Controller('/users')
class UserController {
  @GET('/')
  public async list() {
    return await db`SELECT * FROM users`;
  }

  @DbSession()
  @POST('/')
  public async create() {
    return await db.transaction(async () => {
      await db`INSERT INTO users (name) VALUES (${'alice'})`;
      await db`UPDATE stats SET user_count = user_count + 1`;
      return { ok: true };
    });
  }
}
```

## 推荐阅读

- [生命周期](./lifecycle.md)
- [idleTimeout](./idle-timeout.md)
- [服务注册与发现](./microservice-service-registry.md)
