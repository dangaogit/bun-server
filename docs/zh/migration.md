# 迁移指南

适用于从项目早期版本或其他框架迁移到最新 Bun Server Framework 的场景。

## 1. 项目结构调整

- 统一入口到 `src/index.ts`，示例项目可放在 `examples/`。
- 确保 `tsconfig.json` 开启：
  ```json
  {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
  ```
- 在应用入口（如 `main.ts`）导入一次 `reflect-metadata`：
  ```ts
  import 'reflect-metadata';
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
  @WebSocketGateway('/ws/chat')
  class ChatGateway {
    @OnMessage onMessage(ws, msg) { ws.send(msg); }
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

