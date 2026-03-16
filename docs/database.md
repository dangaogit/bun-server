# Database

Database module v2 is built on top of native `Bun.SQL` and adds request-level strategy routing.

## V2 Highlights

- Native Bun.SQL pool passthrough (no custom physical pool implementation)
- `db` proxy as the preferred query entry (`import { db } from '@dangao/bun-server'`)
- Route strategy control with `@DbStrategy('pool' | 'session')` and `@DbSession()`
- Session strategy uses lazy `reserve()` + request ALS context
- `db.transaction()` and `@Transactional()` are unified through `TransactionManager`
- SQLite improvements: `WAL` mode and write-concurrency guard

## Configuration

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

## Route strategy

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

## Recommended Reading

- [Lifecycle](./lifecycle.md)
- [idleTimeout](./idle-timeout.md)
- [Service Registry](./microservice-service-registry.md)
