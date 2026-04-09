# Migration Guide

**English** | [中文](./zh/migration.md)

---

## v2.x → v3.0 (Platform Adapter)

v3.0.0 introduces the **Platform Adapter Layer** enabling Node.js 22+ support alongside Bun.

### Breaking Changes

| Change | Before | After |
|---|---|---|
| `BunServer.getServer()` return type | `Bun.Server \| undefined` | `IServerHandle \| undefined` |
| `WsArgumentsHost.getClient()` return type | `ServerWebSocket<T>` | `IWebSocket<T>` |

### Migration Steps

**1. Update WebSocket guard types**

```typescript
// Before
import type { ServerWebSocket } from 'bun';
getClient(): ServerWebSocket<unknown>

// After
import type { IWebSocket } from '@dangao/bun-server';
getClient(): IWebSocket<unknown>
```

**2. Update server handle access**

```typescript
// Before
const server: Bun.Server | undefined = app.getServer();

// After
import type { IServerHandle } from '@dangao/bun-server';
const server: IServerHandle | undefined = app.getServer();
// Raw native access (not recommended):
const native: unknown = app.getNativeServer();
```

**3. Everything else is backward compatible.**
Database configuration, module APIs, controllers, services, and middleware require no changes.

---

## v1.x → v2.0

v2.0.0 is **fully backward compatible** with v1.x. All existing modules, APIs, and patterns continue to work without changes.

### What's New

v2.0.0 adds 9 official AI modules as purely additive features:

- `AiModule` — LLM unified access + Tool Calling + streaming
- `ConversationModule` — Multi-turn conversation history
- `PromptModule` — Prompt templates + versioning
- `EmbeddingModule` — Text embedding generation
- `VectorStoreModule` — Vector similarity search
- `RagModule` — Full RAG pipeline
- `McpModule` — MCP protocol server
- `AiGuardModule` — Content safety

See [AI Modules Guide](./ai.md) for full documentation.

### No Breaking Changes

No existing code needs modification. Simply update the package:

```bash
bun add @dangao/bun-server@2.0.0
```

---

## Migrating from Express / Koa / NestJS

Please see the Chinese migration guide (`docs/zh/migration.md`) for detailed migration instructions from:

- Express.js
- Koa.js
- NestJS
- Node.js (to Bun Runtime)

---

## Migrating from Node.js to Bun Runtime

Key differences when switching from Node.js:

1. **No `require()` / CommonJS** — use `import` / ESM exclusively
2. **Use Bun APIs** — prefer `Bun.file()`, `Bun.serve()`, `Bun.SQL` over Node equivalents
3. **TypeScript natively supported** — no compilation step needed for development
4. **Engine**: JavaScriptCore instead of V8 — performance characteristics differ
5. **Package manager**: use `bun install` instead of `npm install`

```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Convert project
bun install  # reads existing package.json
bun run src/index.ts  # runs TypeScript directly
```

---

## Breaking Changes by Release

### v2.0.0

No breaking changes. Purely additive AI module additions.

### v1.9.0

- `EventModule`: `@OnEvent()` listener classes are now auto-scanned at `app.listen()`. Remove manual calls to `EventModule.initializeListeners()` if present.

### v1.8.0

- `ClusterManager` API: `ClusterManager.start()` now accepts options object instead of positional arguments.

### v1.2.0

- `ContextService.getContext()` now returns `Context | undefined` instead of throwing. Update callers to handle `undefined`.
