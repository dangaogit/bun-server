# Changelog - v3.2.0

## Release

- bump `@dangao/bun-server` to `3.2.0`

---

## Highlights

### Database: SQL driver decoupled from the runtime platform

Postgres/MySQL connections previously chose their underlying driver strictly by the runtime engine (Bun → built-in `Bun.SQL`, Node → `mysql2` / `postgres`). This made `bun build --compile` binaries unable to use MySQL reliably, because the frozen `Bun.SQL` MySQL adapter carries known bugs and cannot be hot-patched.

You can now select the driver explicitly via a new optional `driver` field, decoupled from the platform engine (fs/crypto/http server, etc.).

**Full change list:**

- feat(database): add `driver?: 'auto' | 'bun-sql' | 'mysql2' | 'postgres'` to `DatabaseConfig` (postgres/mysql) and to the V2 single-tenant `DatabaseModuleOptions`/`BunSQLConfig`
  - `'auto'` (default): Bun → `bun-sql`, Node → `mysql2`/`postgres` (backward compatible)
  - `'mysql2'` / `'postgres'`: force the pure-JS driver regardless of `getRuntime().engine` — fixes MySQL under `bun build --compile`
  - `'bun-sql'`: force `Bun.SQL` (valid on Bun only; throws a clear error on Node)
- feat(database): introduce a connection-level driver tag that drives connection creation, query execution, health checks and connection close uniformly by the selected driver instead of by `getRuntime().engine`
- fix(database): construct `Bun.SQL` MySQL connections via the options-object form (`{ adapter: 'mysql', hostname, port, username, password, database, ... }`) instead of a connection string, working around oven-sh/bun#26648
- fix(database): `mysql2` query results are now normalized to rows (previously returned the raw `[rows, fields]` tuple)
- feat(database): export `resolveDriver`, `tagConnection`, `getConnectionDriver`, `ResolvedDriver`, `RuntimeEngine`, and `DatabaseDriver` from `@dangao/bun-server`
- test(database): cover driver resolution, connection tagging, per-driver query/health/close dispatch, and a full mysql2 lifecycle (create/query/health/close) under the Bun runtime via module mocking
- chore: the `driver` switch is orthogonal to `BUN_SERVER_PLATFORM`; existing platform semantics are unchanged
