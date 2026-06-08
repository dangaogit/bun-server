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

## Driver selection (decoupled from the runtime platform)

> Added in v3.2.0.

By default the underlying driver for Postgres/MySQL is chosen by the runtime platform: the Bun runtime uses the built-in `Bun.SQL`, while Node.js uses the pure-JS `mysql2` / `postgres` drivers.

The optional `driver` field lets you **explicitly pick a pure-JS driver even under the Bun runtime**, decoupled from the platform engine (fs/crypto/http server, etc.):

| driver | Behavior |
| --- | --- |
| `'auto'` (default) | Bun → `Bun.SQL`; Node → `mysql2` (MySQL) / `postgres` (PostgreSQL). Backward compatible. |
| `'mysql2'` | Always use `mysql2`, regardless of runtime (only for `type: 'mysql'`). |
| `'postgres'` | Always use `postgres`, regardless of runtime (only for `type: 'postgres'`). |
| `'bun-sql'` | Force `Bun.SQL` (valid on Bun only; throws a clear error on Node). |

```ts
DatabaseModule.forRoot({
  database: {
    type: 'mysql',
    driver: 'mysql2', // uses mysql2 even on the Bun runtime
    config: {
      host: '127.0.0.1',
      port: 3306,
      database: 'app',
      user: 'root',
      password: process.env.DB_PASSWORD!,
    },
  },
});

// The V2 single-tenant form is supported too:
DatabaseModule.forRoot({
  type: 'mysql',
  url: process.env.DB_URL!,
  driver: 'mysql2',
});
```

### Why? MySQL under `bun build --compile`

A single binary produced by `bun build --compile` freezes the Bun runtime at build time, and the built-in `Bun.SQL` MySQL adapter has several known issues. Setting `driver: 'mysql2'` lets the compiled binary connect using the statically bundled pure-JS `mysql2` driver, without falling back to SQLite and without switching the whole platform via `BUN_SERVER_PLATFORM=node` (which would also move the HTTP server to Node).

The `driver` switch is orthogonal to `BUN_SERVER_PLATFORM`: the former only selects the SQL driver, while the latter selects the entire platform engine.

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
