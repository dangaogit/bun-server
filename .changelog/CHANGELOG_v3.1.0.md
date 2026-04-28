# Changelog - v3.1.0

## Release

- bump `@dangao/bun-server` to `3.1.0`

---

**Full change list:**

- feat(di): support NestJS-style `ExistingProvider` in module `providers` — `{ provide, useExisting }` resolves `provide` to the same instance as the already-registered `useExisting` token (no new instance)
- feat(di): export `ExistingProvider` type from `@dangao/bun-server`
- test(di): cover alias resolution, cross-module `@Inject` with exported Symbol tokens, and throw when `useExisting` target is not registered
