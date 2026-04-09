# Platform Adapter Guide

**English** | [中文](./zh/platform.md)

---

Bun Server runs natively on **Bun** and **Node.js 22+** through an internal Platform Adapter Layer. All runtime-specific APIs (HTTP server, file I/O, crypto, parsers, process management, WebSocket) are abstracted behind unified TypeScript interfaces. You write one codebase; the framework picks the right implementation at startup — no extra configuration required.

## Table of Contents

- [Architecture](#architecture)
- [Runtime Detection](#runtime-detection)
- [Platform Configuration](#platform-configuration)
- [Support Matrix](#support-matrix)
- [Database Auto-Adaptation](#database-auto-adaptation)
- [Public API Changes](#public-api-changes)
- [Bun-Exclusive Features](#bun-exclusive-features)
- [Node.js Startup Guide](#nodejs-startup-guide)
- [Testing on Multiple Runtimes](#testing-on-multiple-runtimes)
- [Known Limitations](#known-limitations)

---

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Application Layer                    │
│   Controllers / Services / Modules / Middleware       │
└──────────────────────────┬───────────────────────────┘
                           │ getRuntime()
┌──────────────────────────▼───────────────────────────┐
│              Platform Adapter Layer                   │
│  IFsAdapter · ICryptoAdapter · IParserAdapter         │
│  IProcessAdapter · IHttpDriver · IWebSocket           │
└──────┬───────────────────────────────┬───────────────┘
       │                               │
┌──────▼──────┐                 ┌──────▼──────┐
│ BunPlatform │                 │ NodePlatform│
│ Bun.serve   │                 │ node:http   │
│ Bun.file    │                 │ node:fs     │
│ Bun.Crypto  │                 │ node:crypto │
│ spawn(bun)  │                 │ ws package  │
└─────────────┘                 └─────────────┘
```

Each adapter surface has a corresponding TypeScript interface:

| Interface | Bun Implementation | Node.js Implementation |
|---|---|---|
| `IFsAdapter` | `Bun.file`, `Bun.write`, `Bun.Glob` | `node:fs/promises`, `node:fs` glob |
| `ICryptoAdapter` | `Bun.CryptoHasher` | `node:crypto` HMAC/hash |
| `IParserAdapter` | `Bun.JSONC`, `Bun.JSON5`, `Bun.JSONL`, `Bun.markdown` | `jsonc-parser`, `json5`, custom JSONL, `marked` |
| `IProcessAdapter` | `spawn` (bun), `Bun.sleep` | `node:child_process`, `setTimeout` |
| `IHttpDriver` | `Bun.serve` | `node:http.createServer` |
| `IWebSocket<T>` | `Bun.ServerWebSocket<T>` | `ws` package |

---

## Runtime Detection

Platform is resolved at `Application` construction time following this priority chain:

```
1. Bootstrap config  →  new Application({ platform: 'node' })
2. CLI argument      →  --platform=node
3. Environment var   →  BUN_SERVER_PLATFORM=node
4. Auto-detect       →  typeof Bun !== 'undefined' ? 'bun' : 'node'
```

Once resolved, the singleton is frozen for the lifetime of the process. Subsequent calls to `getRuntime()` return the same instance.

---

## Platform Configuration

### Option 1 — Code (highest priority)

```typescript
import { Application } from '@dangao/bun-server';

const app = new Application({ platform: 'node' }); // 'bun' | 'node'
app.registerModule(AppModule);
await app.listen(3000);
```

### Option 2 — CLI argument

```bash
# Bun runtime, but force Node.js adapter
bun run src/main.ts --platform=node

# Node.js runtime (auto-detected even without the flag)
node dist/main.js
```

### Option 3 — Environment variable

```bash
BUN_SERVER_PLATFORM=node node dist/main.js
```

### Option 4 — Auto-detect (default)

No configuration needed. If `typeof Bun !== 'undefined'`, `BunPlatform` is selected; otherwise `NodePlatform` is selected automatically.

---

## Support Matrix

| Feature | Bun | Node.js 22+ |
|---|---|---|
| HTTP server | `Bun.serve` (native) | `node:http` |
| WebSocket | `Bun.ServerWebSocket` (native) | `ws` package |
| File I/O | `Bun.file / Bun.write` | `node:fs/promises` |
| Crypto / JWT | `Bun.CryptoHasher` | `node:crypto` |
| JSONC parsing | `Bun.JSONC` | `jsonc-parser` package |
| JSON5 parsing | `Bun.JSON5` | `json5` package |
| JSONL parsing | `Bun.JSONL` | Custom streaming parser |
| Markdown render | `Bun.markdown` | `marked` package |
| Cluster spawn | Bun `spawn` | `node:child_process` |
| SQLite | `bun:sqlite` | `better-sqlite3` |
| PostgreSQL | `Bun.SQL` | `postgres` package |
| MySQL | `Bun.SQL` | `mysql2` package |
| `idleTimeout` | Yes | Silently ignored |
| `reusePort` | Yes | Silently ignored |
| SSE TCP keepalive | Yes (via `server.timeout`) | Not available |
| Overall performance | Optimal | Good |

---

## Database Auto-Adaptation

`DatabaseModule` automatically selects drivers based on the detected platform. **No additional user configuration is required.**

```
Bun platform                     Node.js platform
─────────────────────────────    ─────────────────────────────
SQLite  →  bun:sqlite            SQLite  →  better-sqlite3
PostgreSQL  →  Bun.SQL           PostgreSQL  →  postgres package
MySQL  →  Bun.SQL                MySQL  →  mysql2 package
```

Your `DatabaseModule` configuration remains identical across platforms:

```typescript
DatabaseModule.forRoot({
  connections: [
    {
      name: 'default',
      type: 'sqlite',
      database: './data/app.db',
    },
    {
      name: 'pg',
      type: 'postgres',
      url: process.env.DATABASE_URL,
    },
  ],
})
```

---

## Public API Changes

### `BunServer.getServer()`

Returns `IServerHandle | undefined` (previously `Bun.Server | undefined`).

```typescript
const handle: IServerHandle | undefined = app.getServer();
handle?.port;      // number
handle?.hostname;  // string
await handle?.stop();

// Access the raw underlying server (not recommended — type is unknown)
const native: unknown = app.getNativeServer();
// Bun:    native as Bun.Server<any>
// Node.js: native as import('node:http').Server
```

### `WsArgumentsHost.getClient()`

Returns `IWebSocket<T>` instead of Bun's `ServerWebSocket<T>`. This is the only breaking WebSocket API change.

```typescript
import type { IWebSocket } from '@dangao/bun-server';

@WebSocketGateway()
class ChatGateway {
  @OnMessage('chat')
  onChat(client: IWebSocket<unknown>, data: unknown) {
    client.send('pong');
  }
}
```

`IWebSocket<T>` exposes the same core methods as `ServerWebSocket<T>`:
`send`, `close`, `data`, `readyState`, `remoteAddress`.

---

## Bun-Exclusive Features

The following options are accepted in `ApplicationOptions` but only take effect on Bun. They are silently ignored on Node.js.

| Option | Effect on Bun | Node.js |
|---|---|---|
| `idleTimeout` | TCP idle timeout via `Bun.serve` | Ignored |
| `reusePort` | Port reuse via `Bun.serve` | Ignored |
| `sseKeepAlive` | Uses `server.timeout(req, 0)` | Heartbeat injection only |

If your application relies on these features, document the Bun runtime requirement explicitly.

---

## Node.js Startup Guide

### 1. Install

```bash
npm install @dangao/bun-server
# Node.js peer dependencies are included automatically
```

### 2. Build

```bash
# Compile TypeScript to plain JS targeting Node.js
bun build src/main.ts --target=node --outdir=dist

# Or use tsc:
npx tsc
```

### 3. Run

```bash
node dist/main.js
# Platform auto-detected as 'node' — no extra flags needed
```

### 4. Smoke test (verify bun build output runs on Node.js)

```bash
bun run test:node
# Runs: vitest run tests/platform/node
```

---

## Testing on Multiple Runtimes

Shared test cases live in `tests/platform/shared/*.cases.ts`. Both Bun and Node.js runners import the same assertions, guaranteeing identical coverage.

```
tests/platform/
├── shared/
│   ├── suite.ts              ← TestSuite interface (test / expect / beforeEach)
│   ├── fs.cases.ts
│   ├── crypto.cases.ts
│   ├── parser.cases.ts
│   ├── process.cases.ts
│   ├── websocket.cases.ts
│   └── database.cases.ts
├── bun/                      ← bun:test runners
│   └── *.test.ts
├── node/                     ← vitest runners
│   ├── *.test.ts
│   └── build-smoke.test.ts   ← verifies bun build --target=node output
└── detector.test.ts          ← priority chain unit tests
```

### Run tests

```bash
# Bun platform tests
bun run test:bun

# Node.js platform tests
bun run test:node

# Both platforms
bun run test:platform
```

---

## Known Limitations

| Limitation | Details |
|---|---|
| `idleTimeout` / `reusePort` | Bun-only; no Node.js equivalent |
| SSE TCP keepalive (`server.timeout`) | Bun-only API; Node.js gets heartbeat injection only |
| `Bun.SQL` features | Some advanced Bun.SQL options (e.g., prepared statement caching) are unavailable in `postgres` / `mysql2` |
| Cluster mode on Node.js | Uses `node:child_process`; may behave differently from Bun's cluster |
| `bun:sqlite` extensions | Bun SQLite supports extensions; `better-sqlite3` extension loading differs |
| Performance | Bun native APIs outperform Node.js polyfills, especially for file I/O and crypto |
