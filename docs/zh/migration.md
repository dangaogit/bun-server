# 迁移指南

适用于从项目早期版本或其他框架迁移到最新 Bun Server Framework 的场景。

## v2.x → v3.0（平台适配层）

v3.0.0 引入 **Platform Adapter Layer**，在保留 Bun 最优性能的同时支持 Node.js 22+。

### 破坏性变更

| 变更点 | 之前 | 之后 |
|---|---|---|
| `BunServer.getServer()` 返回类型 | `Bun.Server \| undefined` | `IServerHandle \| undefined` |
| `WsArgumentsHost.getClient()` 返回类型 | `ServerWebSocket<T>` | `IWebSocket<T>` |

### 迁移步骤

**1. 更新 WebSocket 守卫类型**

```typescript
// 之前
import type { ServerWebSocket } from 'bun';
getClient(): ServerWebSocket<unknown>

// 之后
import type { IWebSocket } from '@dangao/bun-server';
getClient(): IWebSocket<unknown>
```

**2. 更新服务器句柄访问**

```typescript
// 之前
const server: Bun.Server | undefined = app.getServer();

// 之后
import type { IServerHandle } from '@dangao/bun-server';
const server: IServerHandle | undefined = app.getServer();
// 原生访问（不推荐，类型为 unknown）：
const native: unknown = app.getNativeServer();
```

**3. 其他均向后兼容。** 数据库配置、模块 API、控制器、服务和中间件无需修改。

---

## 1. 项目结构调整

- 统一入口到 `src/index.ts`，示例项目可放在 `examples/`。
- 确保 `tsconfig.json` 开启：
  ```json
  {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
  ```
## 2. 路由与控制器

- 将旧的函数式注册迁移到装饰器：
  ```ts
  // 旧
  router.get('/users/:id', handler);

  // 新
  @Controller('/users')
  class UserController {
    @GET('/:id')
    public get(@Param('id') id: string) { ... }
  }
  app.registerController(UserController);
  ```
- 若暂时需要保留函数式路由，可通过 `RouteRegistry.getInstance().register(method, path, handler)`。

## 3. 依赖注入

- 所有可复用服务需添加 `@Injectable()`，并通过构造函数注入使用。
- 旧的单例或全局对象可改为 `app.getContainer().registerInstance(...)` 注入。

## 4. 中间件与错误处理

- 统一使用 `app.use(createErrorHandlingMiddleware())`，并移除 Controller 内的 try/catch。
- 自定义错误响应时，使用 `ExceptionFilterRegistry`：
  ```ts
  ExceptionFilterRegistry.getInstance().register({
    catch(error, ctx) {
      if (error instanceof MyCustomError) {
        return ctx.createResponse({ error: 'custom' }, { status: 418 });
      }
      return undefined;
    },
  });
  ```

## 5. 文件与静态资源

- 旧的上传实现可迁移到 `createFileUploadMiddleware()`，上传结果可从 `context.body.files` 获取。
- 静态资源统一使用 `createStaticFileMiddleware({ root, prefix })`，避免重复编写路径安全逻辑。

## 6. WebSocket

- 将原本在 `Bun.serve({ websocket })` 中手写的逻辑迁移到 `@WebSocketGateway`：
  ```ts
  import { OnMessage, WebSocketGateway } from "@dangao/bun-server";
  import type { ServerWebSocket } from "bun";

  @WebSocketGateway('/ws')
  class ChatGateway {
    @OnMessage
    public handleMessage(ws: ServerWebSocket, message: string) {
      ws.send(`Echo: ${message}`);
    }
  }
  app.registerWebSocketGateway(ChatGateway);
  ```
- 应用启动时会自动处理升级与事件分发。

## 7. 测试与工具

- 使用 `tests/utils/test-port.ts` 生成端口，避免冲突。
- 在 `afterEach` 中调用 `RouteRegistry.getInstance().clear()`、`ControllerRegistry.getInstance().clear()`、`WebSocketGatewayRegistry.getInstance().clear()` 保持测试隔离。
- 若需模拟 Request，可直接 new `Context(new Request(...))`。

## 8. 配置与依赖

- 推荐 Node/Bun 版本：Bun v1.3+、TypeScript 5.4+。
- 若引入额外依赖（如数据库驱动），建议在 Service 层封装并通过 DI 注入，保持控制器轻量。

完成以上步骤即可平滑过渡到最新的 Bun Server Framework。若遇到破坏性变更，可查阅 changelog 或提交 issue。

---

## v1.x → v2.0 迁移说明

**v2.0.0 完全向后兼容**，无破坏性变更。升级只需：

```bash
bun add @dangao/bun-server@2.0.0
```

### 新增内容

v2.0.0 以**纯追加**方式新增 9 个官方 AI 模块：

```typescript
// 新增导入（按需使用，不影响现有代码）
import {
  AiModule,           // LLM 统一接入
  ConversationModule, // 会话记忆
  PromptModule,       // Prompt 模板
  EmbeddingModule,    // 文本嵌入
  VectorStoreModule,  // 向量存储
  RagModule,          // RAG 管道
  McpModule,          // MCP 服务端
  AiGuardModule,      // 内容安全
} from '@dangao/bun-server';
```

详细使用方法参阅 [AI 模块指南](./ai.md)。

### 各版本破坏性变更说明

| 版本 | 破坏性变更 |
|------|----------|
| v2.0.0 | 无 |
| v1.9.0 | EventModule：`@OnEvent()` 监听类现在在 `app.listen()` 时自动扫描，删除手动调用 `EventModule.initializeListeners()` |
| v1.8.0 | ClusterManager：`start()` 接受选项对象参数 |
| v1.2.0 | `ContextService.getContext()` 返回 `Context \| undefined`，不再抛出异常 |

