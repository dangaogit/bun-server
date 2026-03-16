# Changelog - v2.1.0

## Release

- bump `@dangao/bun-server` to `2.1.0`
- bump `@dangao/bun-server-web` to `2.1.0`
- add docs/examples for database v2, nacos auto-register switch, and idle timeout

---

**Full change list:**

- feat(database): introduce Bun.SQL manager, sqlite adapter, ALS session context, db proxy, and route-level db strategy decorators
- refactor(database): migrate transaction manager to ALS-based state and unify `db.transaction()` with `@Transactional`
- fix(di): deduplicate provider instances to prevent duplicate `onModuleInit` execution
- feat(microservice): add `ServiceRegistryModule.autoRegister` switch and listen-time guard in `Application`
- feat(router): support global `idleTimeout` and route-level `@IdleTimeout(ms)` with 408 timeout response
- docs: update database/lifecycle/microservice docs and add `docs/idle-timeout.md` + `docs/zh/idle-timeout.md`
- test: add/refresh database strategy, db proxy, sqlite adapter, sql manager, lifecycle dedup, and timeout coverage
- feat(examples): refresh `database-app.ts`, add `nacos-auto-register-app.ts` and `idle-timeout-app.ts`

