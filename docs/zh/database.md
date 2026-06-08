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

## 驱动选择（driver，与运行时平台解耦）

> v3.2.0 新增。

默认情况下，Postgres/MySQL 连接的底层驱动由运行时平台决定：Bun 运行时使用内建 `Bun.SQL`，Node.js 运行时使用 `mysql2` / `postgres` 纯 JS 驱动。

通过可选的 `driver` 字段，可以**在 Bun 运行时下也显式选用纯 JS 驱动**，与平台引擎（fs/crypto/http server 等）解耦：

| driver | 行为 |
| --- | --- |
| `'auto'`（默认） | Bun → `Bun.SQL`；Node → `mysql2`（MySQL）/ `postgres`（PostgreSQL）。向后兼容。 |
| `'mysql2'` | 无论运行时如何，都使用 `mysql2`（仅 `type: 'mysql'`）。 |
| `'postgres'` | 无论运行时如何，都使用 `postgres`（仅 `type: 'postgres'`）。 |
| `'bun-sql'` | 强制使用 `Bun.SQL`（仅 Bun 合法，Node 会抛出清晰错误）。 |

```ts
DatabaseModule.forRoot({
  database: {
    type: 'mysql',
    driver: 'mysql2', // 即使在 Bun 运行时也走 mysql2
    config: {
      host: '127.0.0.1',
      port: 3306,
      database: 'app',
      user: 'root',
      password: process.env.DB_PASSWORD!,
    },
  },
});

// V2 单租户写法同样支持：
DatabaseModule.forRoot({
  type: 'mysql',
  url: process.env.DB_URL!,
  driver: 'mysql2',
});
```

### 为什么需要它？`bun build --compile` 下的 MySQL

`bun build --compile` 产出的单二进制会把当时的 Bun 运行时焊死，其中内建 `Bun.SQL` 的 MySQL 适配带有若干已知问题。显式设置 `driver: 'mysql2'` 即可让编译产物使用静态打包的纯 JS `mysql2` 驱动连库，无需为此回退到 SQLite，也无需用 `BUN_SERVER_PLATFORM=node` 整体切平台（那会把 HTTP server 也切到 Node）。

`driver` 开关与 `BUN_SERVER_PLATFORM` 正交：前者只决定 SQL 驱动，后者决定整个平台引擎。

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
