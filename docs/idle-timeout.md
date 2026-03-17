# idleTimeout & SSE Keep-Alive

## Two layers of timeout

Bun Server has **two independent timeout mechanisms** — understanding their difference is critical for SSE / streaming use cases.

| Layer | Config | Scope | Mechanism |
|-------|--------|-------|-----------|
| **TCP connection** | `Application({ idleTimeout })` | Bun.serve level | Bun kernel closes the TCP socket when no bytes flow for N seconds |
| **Handler logic** | `@IdleTimeout(ms)` decorator | Per-route `Promise.race` | Returns `408 Request Timeout` if the handler doesn't resolve in time |

> **Key point:** For SSE responses the handler returns a `Response` immediately (with a streaming body). The handler-level `@IdleTimeout` has already resolved at that point and will **not** protect or kill the stream. Only the TCP-level `idleTimeout` can break an SSE connection.

---

## Global idle timeout (milliseconds)

Set in `Application` options using milliseconds.
Framework converts internally before passing to `Bun.serve` (`Math.ceil(ms / 1000)` → seconds).

```ts
const app = new Application({
  port: 3000,
  idleTimeout: 15000, // 15 s — applies to all non-SSE connections
});
```

## Per-route timeout — `@IdleTimeout(ms)`

Use `@IdleTimeout(ms)` on a controller class or a handler method.

```ts
import { Controller, GET, IdleTimeout } from '@dangao/bun-server';

@Controller('/api')
@IdleTimeout(5000) // class-level default
class ApiController {
  @GET('/fast')
  public fast() {
    return { ok: true };
  }

  @GET('/slow')
  @IdleTimeout(1000) // method-level overrides class-level
  public async slow() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { ok: true };
  }
}
```

### Matching & precedence

1. **Method-level** `@IdleTimeout` is checked first — if present, it wins.
2. **Class-level** `@IdleTimeout` is used as fallback.
3. If neither is set, no handler-level timeout is applied (the route runs until the TCP timeout or until it completes).

When the handler-level timeout fires, the framework throws `HttpException(408, "Request Timeout")`.

---

## SSE Keep-Alive (automatic)

When the framework detects a response with `Content-Type: text/event-stream`, it automatically:

1. **Disables the TCP idle timeout** for that request via `server.timeout(req, 0)`, preventing Bun from killing the long-lived connection.
2. **Injects SSE comment heartbeats** (`: keepalive\n\n`) at a configurable interval, preventing intermediate proxies (nginx, cloud load balancers) from closing the connection due to inactivity.

### Configuration

```ts
const app = new Application({
  port: 3000,
  idleTimeout: 10000, // normal requests: 10 s

  // SSE keep-alive — defaults shown below
  sseKeepAlive: {
    enabled: true,      // auto-detect SSE and inject heartbeat
    intervalMs: 15000,  // heartbeat every 15 s
  },
});
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sseKeepAlive.enabled` | `boolean` | `true` | Enable automatic SSE detection, TCP timeout reset, and heartbeat injection |
| `sseKeepAlive.intervalMs` | `number` | `15000` | Heartbeat interval in milliseconds |

When `enabled` is `true` (default), any response whose `Content-Type` header contains `text/event-stream` triggers the SSE post-processor. You do **not** need any special decorator or annotation — detection is purely based on the response header.

When `enabled` is `false`, no SSE-specific processing is applied. You would need to manage keep-alive and `server.timeout` yourself.

---

## Signal cascading (`ctx.signal`)

`Context` exposes the client's `AbortSignal` via `ctx.signal`. When the client disconnects (network failure, browser tab closed, `curl` interrupted), this signal aborts.

For AI streaming endpoints, pass `ctx.signal` to `AiService` so the upstream API request is cancelled immediately — **stopping token consumption**:

```ts
import { Controller, GET, Context as Ctx } from '@dangao/bun-server';
import type { Context } from '@dangao/bun-server';

@Controller('/chat')
class ChatController {
  constructor(private readonly ai: AiService) {}

  @GET('/stream')
  public stream(@Ctx() ctx: Context) {
    const stream = this.ai.stream({
      messages: [{ role: 'user', content: 'Hello' }],
      signal: ctx.signal, // ← cascade client disconnect
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }
}
```

> **Note:** The `Context` parameter decorator is exported as both `Context` (from `'./controller'`) and `ContextParam` (from the package root). Use whichever alias avoids name collision with the `Context` type.

The full cancellation chain:

```
Client disconnects
  → request.signal aborts
    → heartbeat timer cleared
      → wrapped stream cancelled
        → AI provider fetch() aborted
          → upstream API connection closed (tokens saved)
```
