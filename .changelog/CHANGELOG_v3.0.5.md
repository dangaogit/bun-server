# Changelog - v3.0.5

## Release

- bump `@dangao/bun-server` to `3.0.5`

---

**Full change list:**

- feat(queue): migrate `QueueService.registerCron()` to native `Bun.cron()` on the Bun platform — full cron expression support, no-overlap guarantee, `--hot`-safe timer cleanup, and UTC-aligned scheduling; Node.js platform retains the existing `setInterval` fallback
- feat(database): add `ConnectionPool.acquireDisposable()` returning a `Disposable` handle — enables `await using { connection } = await pool.acquireDisposable()` syntax (TC39 Explicit Resource Management, natively supported in Bun 1.3.12+)
- feat(platform): extend `IParserAdapter` with `renderMarkdownAnsi(md)` — Bun platform delegates to `Bun.markdown.ansi()` (Bun 1.3.12+), Node.js platform falls back to HTML-stripped plain text
- chore: add `src/types/bun-augment.d.ts` to provide `Bun.markdown.ansi()` type declarations ahead of the official `@types/bun` update
- docs(cluster): annotate `ClusterManager` Unix socket cleanup with Bun 1.3.12 lifecycle semantics — sockets are now auto-removed on graceful `stop()`; manual `rmSync` is retained for crash-exit scenarios
