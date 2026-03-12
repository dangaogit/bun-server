# Changelog - v2.0.4

## Security

- add `createErrorResponse` in `Context` for error-only response paths and redact sensitive fields (`stack`, `trace`, `cause`) to reduce response leakage risk
- migrate core error return paths to `createErrorResponse` while keeping `createResponse` behavior unchanged for normal business payloads
- remove `.github/workflows/release.yml` to eliminate workflow permission scanning risk for an unused release pipeline

## Web

- bump `@dangao/bun-server-web` to `2.0.4`
- update web-related changelog notes for this release to align security hardening and release metadata

## Testing

- add regression tests for `Context` to verify:
  - `createResponse` keeps business fields unchanged
  - `createErrorResponse` redacts sensitive fields
- add error handler regression test to ensure response body never includes stack traces

---

**Full change list:**

- feat(core): add createErrorResponse with sensitive field redaction
- refactor(error): switch key error responses to createErrorResponse
- test(core,error): add response redaction regression coverage
- chore(ci): remove unused release workflow
- chore(release): bump bun-server and bun-server-web to v2.0.4
