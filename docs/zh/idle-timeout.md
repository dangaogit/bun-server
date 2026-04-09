# idleTimeout 与 SSE 保活

> **平台说明：** `idleTimeout`、`reusePort` 以及基于 `server.timeout` 的 SSE TCP 保活是 **Bun 独有**特性，在 Node.js 上会被静默忽略。`@IdleTimeout(ms)` 装饰器（handler 级超时）在两个平台均可用。详见[平台适配指南](./platform.md#bun-独有特性)。

## 两层超时机制

Bun Server 有**两套独立的超时机制**——理解它们的区别对 SSE / 流式场景至关重要。

| 层面 | 配置方式 | 作用域 | 机制 | Bun | Node.js |
|------|----------|--------|------|-----|---------|
| **TCP 连接级** | `Application({ idleTimeout })` | Bun.serve 底层 | Bun 内核在连接无数据流动 N 秒后直接断开 socket | 支持 | 忽略 |
| **Handler 逻辑级** | `@IdleTimeout(ms)` 装饰器 | 路由粒度的 `Promise.race` | handler 未在指定时间内 resolve 则返回 `408 Request Timeout` | 支持 | 支持 |

> **关键：** 对于 SSE 响应，handler 会立即返回一个带流式 body 的 `Response`。此时 handler 层面的 `@IdleTimeout` 已经 resolve，**不会**保护或终止该流。只有 TCP 级别的 `idleTimeout` 才能断开 SSE 连接。

---

## 全局 idleTimeout（毫秒）

在 `Application` 中按毫秒设置，框架内部自动转换后传给 `Bun.serve`（`Math.ceil(ms / 1000)` → 秒）。

```ts
const app = new Application({
  port: 3000,
  idleTimeout: 15000, // 15 秒 — 对所有非 SSE 连接生效
});
```

## 路由级超时 — `@IdleTimeout(ms)`

使用 `@IdleTimeout(ms)` 装饰器配置控制器级或方法级超时。

```ts
import { Controller, GET, IdleTimeout } from '@dangao/bun-server';

@Controller('/api')
@IdleTimeout(5000) // 控制器级默认值
class ApiController {
  @GET('/fast')
  public fast() {
    return { ok: true };
  }

  @GET('/slow')
  @IdleTimeout(1000) // 方法级优先
  public async slow() {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { ok: true };
  }
}
```

### 匹配与生效规则

1. **方法级** `@IdleTimeout` 优先检测——存在即生效。
2. **类级** `@IdleTimeout` 作为兜底。
3. 若均未设置，则不应用 handler 级超时（路由将持续运行直到 TCP 超时或自然完成）。

handler 级超时触发时，框架抛出 `HttpException(408, "Request Timeout")`。

---

## SSE 保活（自动）

当框架检测到响应的 `Content-Type` 包含 `text/event-stream` 时，会自动执行：

1. **禁用该请求的 TCP 空闲超时** —— 通过 `server.timeout(req, 0)` 阻止 Bun 断开长连接。
2. **注入 SSE 注释心跳** —— 按配置间隔发送 `: keepalive\n\n`，防止中间代理（nginx、云 LB）因空闲而断连。

### 配置

```ts
const app = new Application({
  port: 3000,
  idleTimeout: 10000, // 普通请求：10 秒

  // SSE 保活 — 以下为默认值
  sseKeepAlive: {
    enabled: true,      // 自动检测 SSE 并注入心跳
    intervalMs: 15000,  // 每 15 秒一次心跳
  },
});
```

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `sseKeepAlive.enabled` | `boolean` | `true` | 启用 SSE 自动检测、TCP 超时解除和心跳注入 |
| `sseKeepAlive.intervalMs` | `number` | `15000` | 心跳间隔（毫秒） |

当 `enabled` 为 `true`（默认）时，任何 `Content-Type` 头包含 `text/event-stream` 的响应都会触发 SSE 后处理器。**无需任何特殊装饰器或注解**——纯粹基于响应头自动检测。

当 `enabled` 为 `false` 时，框架不做任何 SSE 特殊处理。你需要自行管理 keep-alive 和 `server.timeout`。

---

## 信号级联（`ctx.signal`）

`Context` 通过 `ctx.signal` 暴露客户端的 `AbortSignal`。当客户端断连（网络故障、关闭浏览器标签、中断 `curl`）时，该信号会 abort。

对于 AI 流式端点，将 `ctx.signal` 传递给 `AiService`，可立即取消上游 API 请求——**停止 token 消耗**：

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
      signal: ctx.signal, // ← 级联客户端断连
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }
}
```

> **注意：** `Context` 参数装饰器既可通过 `Context`（从 `'./controller'`）导入，也可通过包根导出的别名 `ContextParam` 导入。推荐使用 `ContextParam` 或 `Context as Ctx` 以避免与 `Context` 类型名冲突。

完整取消链路：

```
客户端断连
  → request.signal abort
    → 心跳定时器清理
      → 包裹流取消
        → AI Provider 内部 fetch() abort
          → 上游 API 连接关闭（节省 token）
```
