# 06 — Platform Adapter Examples

[English] | [中文](./README_ZH.md)

These examples demonstrate the **Platform Adapter Layer** — the mechanism that enables Bun Server to run transparently on both **Bun** and **Node.js 22+**.

## Examples

| File | Description | Port |
|---|---|---|
| `01-auto-detect.ts` | Auto-detects the runtime (default behaviour) | 3000 |
| `02-explicit-node.ts` | Explicitly selects the Node.js adapter via code | 3001 |
| `03-cli-switch.ts` | Selects platform via CLI arg or env variable | 3002 |

## Quick Start

### Run on Bun (default)

```bash
# Auto-detect (runs BunPlatform when under Bun)
bun 06-platform/01-auto-detect.ts

# Explicit Node.js adapter, even though running under Bun
bun 06-platform/02-explicit-node.ts

# CLI argument switch
bun 06-platform/03-cli-switch.ts --platform=node
```

### Run on Node.js

```bash
# Build with --packages=external so CJS packages stay external (no import.meta.require)
bun build 06-platform/01-auto-detect.ts \
  --target=node --packages=external \
  --outfile=dist/01-auto-detect.mjs

# Run with Node.js — NodePlatform is auto-detected
node dist/01-auto-detect.mjs
```

> **Why `--packages=external`?**  
> `bun build --target=node` inlines CJS packages using `import.meta.require`, which is a Bun-only
> extension. Using `--packages=external` keeps all npm packages as external imports resolved by
> Node.js at runtime, producing a clean Node.js-compatible `.mjs` bundle.

## Platform Priority Chain

```
1. ApplicationOptions.platform  →  new Application({ platform: 'node' })
2. CLI argument                 →  --platform=node
3. Environment variable         →  BUN_SERVER_PLATFORM=node
4. Auto-detect                  →  Bun present → 'bun', else → 'node'
```

## What Changes Between Platforms

| Feature | Bun | Node.js |
|---|---|---|
| HTTP server | `Bun.serve` | `node:http` |
| File I/O | `Bun.file / write` | `node:fs` |
| Crypto (JWT) | `Bun.CryptoHasher` | `node:crypto` |
| JSONC / JSON5 | `Bun.JSONC / JSON5` | `jsonc-parser / json5` |
| Markdown | `Bun.markdown` | `marked` |
| WebSocket | `Bun.ServerWebSocket` | `ws` package |
| SQLite | `bun:sqlite` | `better-sqlite3` |
| PostgreSQL | `Bun.SQL` | `postgres` package |
| MySQL | `Bun.SQL` | `mysql2` package |

All switching is **automatic and transparent** — your application code stays the same.

## See Also

- [Platform Adapter Guide](../../docs/platform.md)
- [API Reference](../../docs/api.md)
