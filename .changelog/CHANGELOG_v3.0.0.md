# Changelog - v3.0.0

## Release

- bump `@dangao/bun-server` to `3.0.0`
- bump `@dangao/bun-server-web` to `3.0.0`
- Platform Adapter Layer: transparent multi-runtime support (Bun + Node.js 22+)

---

**Full change list:**

- feat(platform): introduce `IPlatform` interface with six adapter contracts — `IFsAdapter`, `ICryptoAdapter`, `IParserAdapter`, `IProcessAdapter`, `IHttpDriver`, `IWebSocket<T>`
- feat(platform): implement `BunPlatform` adapter — wraps `Bun.file/write/Glob`, `Bun.CryptoHasher`, `Bun.JSONC/JSON5/markdown`, `Bun.serve`, `Bun.spawn`, `Bun.ServerWebSocket`
- feat(platform): implement `NodePlatform` adapter — uses `node:fs`, `node:crypto`, `jsonc-parser`/`json5`/`marked`, `node:http`, `node:child_process`, `ws`
- feat(platform): add `resolvePlatform()` with priority chain: `ApplicationOptions.platform` > `--platform=<x>` CLI arg > `BUN_SERVER_PLATFORM` env > runtime auto-detect
- feat(platform): add `initRuntime(engine?)` / `getRuntime()` singleton accessor; exported from `@dangao/bun-server`
- feat(platform): `IHttpDriver.serve()` returns `Promise<IServerHandle>` — `BunServer.start()` updated to `async`
- feat(platform): expose `IServerHandle.getNative()` for direct access to the underlying server object
- feat(database): `DatabaseModule`, `SqliteAdapter`, `SqlManager`, `ConnectionPool` auto-detect runtime and switch between `bun:sqlite`/`Bun.SQL` and `better-sqlite3`/`postgres`/`mysql2` — no user configuration needed
- feat(platform): add Node.js-targeted package build (`bundle:node` script, `dist/index.node.mjs`) with `"node"` export condition in `package.json`
- feat(examples): add `examples/06-platform/` — `01-auto-detect.ts`, `02-explicit-node.ts`, `03-cli-switch.ts`
- test(platform): add shared test suites (`tests/platform/shared/*.cases.ts`) run under both `bun:test` and `vitest` across fs / crypto / parser / process / websocket / database adapters
- test(platform): add `tests/platform/node/build-smoke.test.ts` to verify Node.js execution of built output
- docs: add `docs/platform.md` and `docs/zh/platform.md` — full multi-runtime architecture guide
- docs: update `README.md` and `README_ZH.md` — new Node.js badge, Platform Adapter Layer architecture diagram, support matrix, platform differences table
- docs: update `docs/deployment.md`, `docs/migration.md`, `docs/testing.md`, `docs/idle-timeout.md` and their `zh/` counterparts for v3.0 multi-runtime context
- fix(platform/bun): replace `import { spawn } from 'bun'` with `Bun.spawn` global to prevent top-level `globalThis.Bun` destructure in `bun build --target=node` output
- chore(deps): add `jsonc-parser`, `json5`, `marked`, `mime-types`, `ws`, `postgres`, `mysql2`, `better-sqlite3` as runtime dependencies; `vitest`, `@types/ws`, `@types/mime-types`, `@types/better-sqlite3` as devDependencies
- chore: bump `@dangao/bun-server` and `@dangao/bun-server-web` to 3.0.0 and sync web changelog pages

**BREAKING CHANGES:**

- `WsArgumentsHost.getClient()` now returns `IWebSocket<unknown>` instead of Bun's native `ServerWebSocket<T>`; use `getNative()` on the server handle for direct Bun types
- `BunServer.getServer()` returns `IServerHandle` — call `.getNative()` to unwrap the underlying runtime server
- `BunServer.start()` is now `async`; `Application.listen()` already `await`s it transparently
