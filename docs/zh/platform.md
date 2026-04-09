# 平台适配指南

[English](../platform.md) | **中文**

---

Bun Server 通过内部的 Platform Adapter Layer，原生支持在 **Bun** 和 **Node.js 22+** 上运行。所有运行时相关的 API（HTTP 服务器、文件 I/O、加密、解析器、进程管理、WebSocket）均被抽象到统一的 TypeScript 接口后。你编写一套代码，框架在启动时自动选择正确的实现——无需额外配置。

## 目录

- [架构](#架构)
- [运行时检测](#运行时检测)
- [平台配置](#平台配置)
- [支持矩阵](#支持矩阵)
- [数据库自动适配](#数据库自动适配)
- [公开 API 变更](#公开-api-变更)
- [Bun 独有特性](#bun-独有特性)
- [Node.js 启动指南](#nodejs-启动指南)
- [多运行时测试](#多运行时测试)
- [已知限制](#已知限制)

---

## 架构

```
┌──────────────────────────────────────────────────────┐
│                   应用层                              │
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

每个适配器接口及其对应实现：

| 接口 | Bun 实现 | Node.js 实现 |
|---|---|---|
| `IFsAdapter` | `Bun.file`、`Bun.write`、`Bun.Glob` | `node:fs/promises`、`node:fs` glob |
| `ICryptoAdapter` | `Bun.CryptoHasher` | `node:crypto` HMAC/hash |
| `IParserAdapter` | `Bun.JSONC`、`Bun.JSON5`、`Bun.JSONL`、`Bun.markdown` | `jsonc-parser`、`json5`、自定义 JSONL、`marked` |
| `IProcessAdapter` | `spawn`（bun）、`Bun.sleep` | `node:child_process`、`setTimeout` |
| `IHttpDriver` | `Bun.serve` | `node:http.createServer` |
| `IWebSocket<T>` | `Bun.ServerWebSocket<T>` | `ws` 包 |

---

## 运行时检测

平台在 `Application` 构造时按以下优先级链解析：

```
1. Bootstrap 配置  →  new Application({ platform: 'node' })
2. CLI 参数        →  --platform=node
3. 环境变量        →  BUN_SERVER_PLATFORM=node
4. 自动检测        →  typeof Bun !== 'undefined' ? 'bun' : 'node'
```

一旦解析完成，单例在进程生命周期内保持不变。后续调用 `getRuntime()` 始终返回同一实例。

---

## 平台配置

### 方式一 — 代码配置（最高优先级）

```typescript
import { Application } from '@dangao/bun-server';

const app = new Application({ platform: 'node' }); // 'bun' | 'node'
app.registerModule(AppModule);
await app.listen(3000);
```

### 方式二 — CLI 参数

```bash
# Bun 运行时，但强制使用 Node.js 适配器
bun run src/main.ts --platform=node

# Node.js 运行时（无需参数，自动检测）
node dist/main.js
```

### 方式三 — 环境变量

```bash
BUN_SERVER_PLATFORM=node node dist/main.js
```

### 方式四 — 自动检测（默认，无需配置）

无需任何配置。如果 `typeof Bun !== 'undefined'`，选择 `BunPlatform`；否则自动选择 `NodePlatform`。

---

## 支持矩阵

| 特性 | Bun | Node.js 22+ |
|---|---|---|
| HTTP 服务器 | `Bun.serve`（原生） | `node:http` |
| WebSocket | `Bun.ServerWebSocket`（原生） | `ws` 包 |
| 文件 I/O | `Bun.file / Bun.write` | `node:fs/promises` |
| Crypto / JWT | `Bun.CryptoHasher` | `node:crypto` |
| JSONC 解析 | `Bun.JSONC` | `jsonc-parser` 包 |
| JSON5 解析 | `Bun.JSON5` | `json5` 包 |
| JSONL 解析 | `Bun.JSONL` | 自定义流式解析器 |
| Markdown 渲染 | `Bun.markdown` | `marked` 包 |
| Cluster spawn | Bun `spawn` | `node:child_process` |
| SQLite | `bun:sqlite` | `better-sqlite3` |
| PostgreSQL | `Bun.SQL` | `postgres` 包 |
| MySQL | `Bun.SQL` | `mysql2` 包 |
| `idleTimeout` | 支持 | 静默忽略 |
| `reusePort` | 支持 | 静默忽略 |
| SSE TCP keepalive | 支持（via `server.timeout`） | 不可用 |
| 整体性能 | 最优 | 良好 |

---

## 数据库自动适配

`DatabaseModule` 根据检测到的平台自动选择数据库驱动，**无需用户额外配置**。

```
Bun 平台                          Node.js 平台
─────────────────────────────    ─────────────────────────────
SQLite  →  bun:sqlite            SQLite  →  better-sqlite3
PostgreSQL  →  Bun.SQL           PostgreSQL  →  postgres 包
MySQL  →  Bun.SQL                MySQL  →  mysql2 包
```

你的 `DatabaseModule` 配置在两个平台间完全一致：

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

## 公开 API 变更

### `BunServer.getServer()`

返回 `IServerHandle | undefined`（原来为 `Bun.Server | undefined`）。

```typescript
const handle: IServerHandle | undefined = app.getServer();
handle?.port;      // number
handle?.hostname;  // string
await handle?.stop();

// 访问底层原生服务器实例（不推荐，类型为 unknown）
const native: unknown = app.getNativeServer();
// Bun:     native as Bun.Server<any>
// Node.js: native as import('node:http').Server
```

### `WsArgumentsHost.getClient()`

返回 `IWebSocket<T>` 而非 Bun 的 `ServerWebSocket<T>`。这是 WebSocket 公开 API 中的**唯一破坏性变更**。

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

`IWebSocket<T>` 暴露与 `ServerWebSocket<T>` 相同的核心方法：
`send`、`close`、`data`、`readyState`、`remoteAddress`。

---

## Bun 独有特性

以下选项在 `ApplicationOptions` 中接受，但仅在 Bun 上生效，在 Node.js 上静默忽略。

| 选项 | Bun 效果 | Node.js |
|---|---|---|
| `idleTimeout` | 通过 `Bun.serve` 设置 TCP 空闲超时 | 忽略 |
| `reusePort` | 通过 `Bun.serve` 启用端口复用 | 忽略 |
| `sseKeepAlive` | 使用 `server.timeout(req, 0)` | 仅注入心跳 |

如果你的应用依赖这些特性，请在文档中明确说明对 Bun 运行时的要求。

---

## Node.js 启动指南

### 1. 安装

```bash
npm install @dangao/bun-server
# Node.js 所需的对等依赖会自动安装
```

### 2. 构建

```bash
# 使用 bun build 输出面向 Node.js 的 JS 文件
bun build src/main.ts --target=node --outdir=dist

# 或使用 tsc
npx tsc
```

### 3. 运行

```bash
node dist/main.js
# 平台自动检测为 'node'，无需额外参数
```

### 4. 冒烟测试（验证 bun build 输出能被 Node.js 原生运行）

```bash
bun run test:node
# 等价于：vitest run tests/platform/node
```

---

## 多运行时测试

共享测试用例位于 `tests/platform/shared/*.cases.ts`。Bun 和 Node.js 的测试运行器导入相同的断言，保证测试覆盖完全一致。

```
tests/platform/
├── shared/
│   ├── suite.ts              ← TestSuite 接口（test / expect / beforeEach）
│   ├── fs.cases.ts
│   ├── crypto.cases.ts
│   ├── parser.cases.ts
│   ├── process.cases.ts
│   ├── websocket.cases.ts
│   └── database.cases.ts
├── bun/                      ← bun:test 运行器
│   └── *.test.ts
├── node/                     ← vitest 运行器
│   ├── *.test.ts
│   └── build-smoke.test.ts   ← 验证 bun build --target=node 输出
└── detector.test.ts          ← 优先级链单元测试
```

### 执行测试

```bash
# Bun 平台测试
bun run test:bun

# Node.js 平台测试
bun run test:node

# 两个平台全部测试
bun run test:platform
```

---

## 已知限制

| 限制 | 说明 |
|---|---|
| `idleTimeout` / `reusePort` | Bun 独有，Node.js 无对等实现 |
| SSE TCP keepalive（`server.timeout`） | Bun 独有 API；Node.js 仅支持心跳注入 |
| `Bun.SQL` 高级特性 | 部分 Bun.SQL 选项（如预处理语句缓存）在 `postgres`/`mysql2` 中不可用 |
| Node.js 上的 Cluster 模式 | 使用 `node:child_process`，行为可能与 Bun cluster 存在差异 |
| `bun:sqlite` 扩展 | Bun SQLite 支持扩展加载；`better-sqlite3` 的扩展机制不同 |
| 整体性能 | Bun 原生 API 在文件 I/O 和加密等方面性能优于 Node.js 适配实现 |
