# Database

This page summarizes database-related documentation in Bun Server Framework.

## Core Database Capabilities

- `DatabaseModule`: connection management, health checks, and SQL access.
- ORM support: entity metadata, repositories, and query helpers.
- Transactions: declarative transaction boundaries and rollback handling.

## Recommended Reading

- [API Reference](./api.md)
- [Best Practices](./best-practices.md)
- [Testing](./testing.md)
- [Migration Guide](./migration.md)

## Typical Setup

1. Configure `DatabaseModule.forRoot(...)` in the root module.
2. Define entities/repositories per feature module.
3. Use transactions for multi-step write operations.
4. Add health checks and monitor connection pool metrics.
