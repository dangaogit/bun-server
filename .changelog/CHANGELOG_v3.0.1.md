# Changelog - v3.0.1

## Release

- bump `@dangao/bun-server` to `3.0.1`

---

**Full change list:**

- fix(database): replace `better-sqlite3` with `@vscode/sqlite3 5.1.12-vscode` as the Node.js SQLite driver
- fix(database): `SqliteAdapter.query()` is now `async` — Node.js path uses `@vscode/sqlite3`'s callback-based `db.all()` wrapped in a Promise
- fix(database): `SqliteAdapter.execute()` Node.js path uses `db.run()` from `@vscode/sqlite3`
- fix(database): `ConnectionPool.createSqliteConnection()` Node.js path uses `new sqlite3.Database(path)` from `@vscode/sqlite3`
- fix(database): `DatabaseService.querySqlite()` adds async branch for `@vscode/sqlite3` connections (detects `.all()` callback method)
- fix(database): `ConnectionManager.healthCheckSqlite()` adds async health-check path for `@vscode/sqlite3` connections
- chore(deps): remove `better-sqlite3` and `@types/better-sqlite3`; add `@vscode/sqlite3@5.1.12-vscode`
- chore(build): add `--external @vscode/sqlite3` to the `bundle` script — native addon cannot be inlined by `bun build`
- test(platform): update `database.cases.ts` to `async` test with `await adapter.query()` calls; update skip comment to reference `@vscode/sqlite3`
