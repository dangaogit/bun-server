# Changelog - v3.0.2

## Release

- bump `@dangao/bun-server` to `3.0.2`

---

**Full change list:**

- refactor(database): move `@vscode/sqlite3` from `dependencies` to `peerDependencies` with `optional: true` — no longer installed automatically
- refactor(database): `SqliteAdapter` and `ConnectionPool` now catch `require('@vscode/sqlite3')` failures and throw a clear install instruction: `bun add @vscode/sqlite3@5.1.12-vscode`
