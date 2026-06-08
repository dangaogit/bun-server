# Changelog - v3.3.0

## Release

- bump `@dangao/bun-server` to `3.3.0`
- bump `@dangao/bun-server-web` to `3.3.0`

---

## Highlights

### DI: FactoryProvider inject support

`FactoryProvider.useFactory` now receives resolved `inject` tokens in order. Factories without `inject`, or with an empty `inject` array, still receive the current `Container` as the only argument for backward compatibility.

**Full change list:**

- fix(di): honor optional `inject` in `FactoryProvider` — previously ignored and passed `Container` instead (potential breaking-fix for factories that declared `inject`)
- fix(di): preserve backward compatibility when `inject` is omitted or empty
- test(di): regression coverage for injected dependencies, cross-module exported tokens, argument order, and mixed `useExisting`/`useValue`/`useClass` providers
- chore: add monorepo `typecheck` scripts and `tsconfig.test.json` with bun-test shims
- chore: fix strict type errors across core modules, examples, and benchmark
