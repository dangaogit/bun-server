# Changelog - v2.3.0

## Release

- bump `@dangao/bun-server` to `2.3.0`
- bump `@dangao/bun-server-web` to `2.3.0`
- SSE keep-alive, signal cascading, and idle-timeout documentation overhaul

---

**Full change list:**

- feat(core): auto-detect SSE responses (`text/event-stream`) and disable Bun TCP idle timeout via `server.timeout(req, 0)`
- feat(core): inject SSE heartbeat (`: keepalive\n\n`) at configurable interval to prevent proxy disconnects
- feat(core): add `sseKeepAlive` configuration to `ApplicationOptions` (`enabled`, `intervalMs`)
- feat(core): expose `ctx.signal` (`AbortSignal`) on `Context` for client disconnect cascading
- feat(ai): add `signal` field to `AiRequest` for abort propagation to upstream AI APIs
- feat(ai): pass `signal` through all 4 providers (OpenAI, Anthropic, Google, Ollama) `stream()` and `complete()` fetch calls
- feat(ai): abort-aware `withTimeout` in `AiService` to stop token consumption on client disconnect
- refactor(mcp): remove manual `setInterval` ping from `McpServer.createSseResponse()` — now handled by framework SSE post-processor
- docs: rewrite `docs/idle-timeout.md` and `docs/zh/idle-timeout.md` with two-layer timeout explanation, SSE keep-alive config, `@IdleTimeout` matching rules, and `ctx.signal` cascading guide
- feat(examples): add SSE endpoint to `idle-timeout-app.ts` demonstrating auto keep-alive and signal cascading
- chore: bump `@dangao/bun-server` and `@dangao/bun-server-web` to 2.3.0 and sync web changelog pages
