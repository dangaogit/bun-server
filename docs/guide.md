# 使用指南

涵盖从零开始构建 Bun Server 应用的关键步骤。

## 1. 初始化应用

```ts
import 'reflect-metadata';
import { Application } from '../src';

const app = new Application({ port: 3000 });
app.listen();
```

> Tip: 默认端口为 3000，可通过 `app.listen(customPort)` 或 `new Application({ port })` 调整。

## 2. 注册控制器与依赖

```ts
import {
  Controller,
  GET,
  POST,
  Body,
  Param,
  Injectable,
  Application,
} from '../src';

@Injectable()
class UserService {
  private readonly users = new Map<string, string>([['1', 'Alice']]);
  public get(id: string) {
    return this.users.get(id);
  }
  public create(name: string) {
    const id = String(this.users.size + 1);
    this.users.set(id, name);
    return { id, name };
  }
}

@Controller('/api/users')
class UserController {
  public constructor(private readonly service: UserService) {}

  @GET('/:id')
  public getUser(@Param('id') id: string) {
    return this.service.get(id) ?? { error: 'Not Found' };
  }

  @POST('/')
  public createUser(@Body() payload: { name: string }) {
    return this.service.create(payload.name);
  }
}

const app = new Application({ port: 3000 });
app.registerController(UserController);
app.listen();
```

## 3. 使用中间件

```ts
import { createLoggerMiddleware, createCorsMiddleware } from '../src';

const app = new Application();
app.use(createLoggerMiddleware({ prefix: '[Example]' }));
app.use(createCorsMiddleware({ origin: '*' }));
```

`@UseMiddleware()` 可作用于单个控制器或方法：

```ts
import { UseMiddleware } from '../src';

const auth = async (ctx, next) => {
  if (ctx.getHeader('authorization') !== 'token') {
    ctx.setStatus(401);
    return ctx.createResponse({ error: 'Unauthorized' });
  }
  return await next();
};

@UseMiddleware(auth)
@Controller('/secure')
class SecureController { ... }
```

## 4. 参数验证

```ts
import { Validate, IsEmail, MinLength } from '../src';

@POST('/register')
public register(
  @Body('email') @Validate(IsEmail()) email: string,
  @Body('password') @Validate(MinLength(6)) password: string,
) {
  return { email };
}
```

验证失败将抛出 `ValidationError`，默认错误处理中间件会返回 400 + 详细 `issues`。

## 5. WebSocket 网关

```ts
import { WebSocketGateway, OnMessage } from '../src';

@WebSocketGateway('/ws/chat')
class ChatGateway {
  @OnMessage
  public onMessage(ws, message: string) {
    ws.send(`echo: ${message}`);
  }
}

app.registerWebSocketGateway(ChatGateway);
```

## 6. 文件上传与静态资源

```ts
import { createFileUploadMiddleware, createStaticFileMiddleware } from '../src';

app.use(createFileUploadMiddleware({ maxSize: 5 * 1024 * 1024 }));
app.use(createStaticFileMiddleware({ root: './public', prefix: '/assets', enableCache: true }));
```

上传后的文件可在 `context.body.files` 中读取；静态资源请求会自动设置 Content-Type 与缓存头。

## 7. 错误处理与自定义过滤器

```ts
import { ExceptionFilterRegistry, HttpException } from '../src';

ExceptionFilterRegistry.getInstance().register({
  catch(error, context) {
    if (error instanceof HttpException && error.status === 403) {
      return context.createResponse({ error: 'No permission' }, { status: 403 });
    }
    return undefined;
  },
});
```

默认的 `createErrorHandlingMiddleware` 已自动添加到应用，确保异常均被捕获。

## 8. 测试建议

- 使用 `tests/utils/test-port.ts` 获取自增端口，避免本地冲突。
- 在 `afterEach` 钩子中调用 `RouteRegistry.getInstance().clear()` 和 `ControllerRegistry.getInstance().clear()`，保持全局状态干净。
- 端到端测试中可直接实例化 `Context` 并调用 `router.handle(context)`，无需真正启动服务器。

