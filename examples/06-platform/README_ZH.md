# 06 — 平台适配示例

[English](./README.md) | 中文

这些示例演示 **Platform Adapter Layer** 的用法——该机制使 Bun Server 能够透明地运行在 **Bun** 和 **Node.js 22+** 上。

## 示例列表

| 文件 | 说明 | 端口 |
|---|---|---|
| `01-auto-detect.ts` | 自动检测运行时（默认行为） | 3000 |
| `02-explicit-node.ts` | 通过代码显式选择 Node.js 适配器 | 3001 |
| `03-cli-switch.ts` | 通过 CLI 参数或环境变量切换平台 | 3002 |

## 快速开始

### 在 Bun 上运行（默认）

```bash
# 自动检测（Bun 环境下使用 BunPlatform）
bun 06-platform/01-auto-detect.ts

# 显式使用 Node.js 适配器（即使在 Bun 环境下）
bun 06-platform/02-explicit-node.ts

# CLI 参数切换
bun 06-platform/03-cli-switch.ts --platform=node
```

### 在 Node.js 上运行

```bash
# 使用 --packages=external 构建，让 CJS 包保持外部依赖（避免 import.meta.require）
bun build 06-platform/01-auto-detect.ts \
  --target=node --packages=external \
  --outfile=dist/01-auto-detect.mjs

# 用 Node.js 运行——自动检测为 NodePlatform
node dist/01-auto-detect.mjs
```

> **为什么需要 `--packages=external`？**  
> `bun build --target=node` 默认会将 CJS 包内联，并使用 `import.meta.require`（Bun 私有扩展）。
> 添加 `--packages=external` 后，所有 npm 包保持为外部依赖，由 Node.js 在运行时解析，
> 从而生成纯 Node.js 兼容的 `.mjs` bundle。

## 平台优先级链

```
1. ApplicationOptions.platform  →  new Application({ platform: 'node' })
2. CLI 参数                     →  --platform=node
3. 环境变量                     →  BUN_SERVER_PLATFORM=node
4. 自动检测                     →  存在 Bun → 'bun'，否则 → 'node'
```

## 平台间的差异

| 特性 | Bun | Node.js |
|---|---|---|
| HTTP 服务器 | `Bun.serve` | `node:http` |
| 文件 I/O | `Bun.file / write` | `node:fs` |
| Crypto（JWT） | `Bun.CryptoHasher` | `node:crypto` |
| JSONC / JSON5 | `Bun.JSONC / JSON5` | `jsonc-parser / json5` |
| Markdown | `Bun.markdown` | `marked` |
| WebSocket | `Bun.ServerWebSocket` | `ws` 包 |
| SQLite | `bun:sqlite` | `better-sqlite3` |
| PostgreSQL | `Bun.SQL` | `postgres` 包 |
| MySQL | `Bun.SQL` | `mysql2` 包 |

所有切换均**自动透明**——你的应用代码保持不变。

## 相关文档

- [平台适配指南](../../docs/zh/platform.md)
- [API 文档](../../docs/api.md)
