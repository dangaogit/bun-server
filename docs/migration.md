# Migration Guide

**English** | [中文](./zh/migration.md)

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
