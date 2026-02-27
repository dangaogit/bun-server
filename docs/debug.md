# Debug & Request Replay Module

The Debug Module records HTTP requests in development and provides a UI to inspect and replay them.

## Configuration

```ts
DebugModule.forRoot({
  enabled: true,       // default
  maxRecords: 500,      // default, ring buffer size
  recordBody: true,     // default, capture request/response bodies
  path: '/_debug',     // default
})
```

## Recorded Data

Each `RequestRecord` includes:

- **id**: Unique record ID
- **timestamp**: Request time
- **request**: method, path, headers, body (if `recordBody`)
- **response**: status, headers, bodySize
- **timing**: total duration (ms)
- **metadata**: matchedRoute, controller, methodName

## Debug UI Endpoints

| Path | Method | Description |
|------|--------|-------------|
| `/{path}` | GET | Debug UI (HTML) |
| `/{path}/api/records` | GET | List all records |
| `/{path}/api/records` | DELETE | Clear all records |
| `/{path}/api/records/:id` | GET | Get single record |
| `/{path}/api/replay/:id` | POST | Replay a request |

## Request Replay

`POST /_debug/api/replay/:id` replays the recorded request against the current server. The response includes `ok`, `status`, `body`, or `error` on failure.

## Example

```ts
@Module({
  imports: [
    DebugModule.forRoot({
      enabled: true,
      maxRecords: 100,
      recordBody: true,
      path: '/_debug',
    }),
  ],
  controllers: [AppController],
})
class AppModule {}
```

Visit `http://localhost:3000/_debug` to view recorded requests and replay them.
