# Security

This page summarizes security-related documentation in Bun Server Framework.

## Core Security Modules

- `SecurityModule`: authentication flow, authorization checks, guard integration.
- `auth` module: JWT/OAuth2 providers and token processing.
- Guards: route-level access control and role checks.

## Recommended Reading

- [API Reference](./api.md)
- [Guards](./guards.md)
- [Best Practices](./best-practices.md)
- [Error Handling](./error-handling.md)

## Typical Setup

1. Configure `SecurityModule.forRoot(...)` in the root module.
2. Apply `@Auth()` / guards on protected routes.
3. Keep secrets in environment variables, never in source code.
4. Add request logging and rate limiting for sensitive endpoints.
