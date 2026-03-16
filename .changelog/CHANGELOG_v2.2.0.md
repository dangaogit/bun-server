# Changelog - v2.2.0

## Release

- bump `@dangao/bun-server` to `2.2.0`
- bump `@dangao/bun-server-web` to `2.2.0`
- add full component lifecycle hooks from creation to destruction

---

**Full change list:**

- feat(di): add component lifecycle hooks `onBeforeCreate`/`onAfterCreate`/`onBeforeDestroy`/`onAfterDestroy` for `@Controller` and `@Injectable`
- feat(di): align controller lifecycle execution with providers in module startup/shutdown flow
- feat(core): auto-dispose `Lifecycle.Scoped` instances at request end and invoke scoped destroy hooks
- feat(examples): enhance `examples/01-core-features/lifecycle-app.ts` with `/api/scoped` and request-scoped lifecycle logs
- docs(test): update lifecycle docs and add coverage for create/destroy hook ordering plus scoped cleanup

