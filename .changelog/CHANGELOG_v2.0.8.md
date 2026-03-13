# Changelog - v2.0.8

## Release

- bump `@dangao/bun-server` to `2.0.8`
- bump `@dangao/bun-server-web` to `2.0.8`
- sync web changelog pages with the latest backend/database updates

---

**Full change list:**

- fix(database): use Bun.SQL template values for parameter binding and surface original query errors
- refactor(core): replace `catch {}` with explicit exception bindings across `packages/bun-server/src`
- feat(examples): allow custom SQL input in the real-world database test app
- test(database): add Bun.SQL parameter binding regression tests
- chore(release): bump bun-server and web versions to `v2.0.8` and sync web changelog entries
