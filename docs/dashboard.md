# Dashboard Module

The Dashboard Module provides a monitoring Web UI with system metrics, route listing, and health status.

## Configuration

```ts
DashboardModule.forRoot({
  path: '/_dashboard',  // default
  auth: { username: 'admin', password: 'admin' },
})
```

- **path**: Base path for the dashboard (default `/_dashboard`)
- **auth**: Optional Basic Auth. If omitted, the dashboard is unauthenticated.

## Endpoints

| Path | Description |
|------|--------------|
| `/{path}` | Dashboard UI (HTML) |
| `/{path}/api/system` | System info (uptime, memory, platform, Bun version) |
| `/{path}/api/routes` | Registered routes (method, path, controller, methodName) |
| `/{path}/api/health` | Health check results (if HealthModule is used) |

## Basic Auth

When `auth` is set, all dashboard endpoints require Basic Auth. The browser will prompt for credentials.

## UI Description

The dashboard is a dark-themed single-page UI with:

- **Header**: "Bun Server Dashboard" and a short description
- **Cards**: System (uptime, memory, platform), Routes (count and list), Health (status and details)
- **Layout**: Responsive grid of cards with monospace values
- **Links**: Quick links to system, routes, and health API endpoints

## Example

```ts
@Module({
  imports: [
    DashboardModule.forRoot({
      path: '/_dashboard',
      auth: { username: 'admin', password: 'admin' },
    }),
  ],
  controllers: [AppController],
})
class AppModule {}
```

Access at `http://localhost:3000/_dashboard` (credentials: admin/admin).
