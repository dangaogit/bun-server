# 类型安全客户端生成

Bun Server 支持从服务端路由自动生成类型安全的 API 客户端，便于前端或微服务调用。

## ClientGenerator.generate()

从当前已注册的 `RouteRegistry` 提取路由清单：

```ts
import { ClientGenerator } from '@dangao/bun-server';

const manifest = ClientGenerator.generate();
// { routes: [{ method, path, controllerName, methodName }, ...] }
```

## createClient(manifest, config)

根据清单和配置创建 API 客户端：

```ts
import { createClient } from '@dangao/bun-server';

const client = createClient(manifest, {
  baseUrl: 'http://localhost:3001',
  headers: { 'X-API-Key': 'xxx' },
});
```

## 客户端结构

客户端按控制器名称分组（去除 `Controller` 后缀并首字母小写），每个方法名对应一个函数：

- `UserController` → `client.user`
- `getUser` → `client.user.getUser({ params: { id: '1' } })`

## 完整示例

```ts
import {
  Application,
  Controller,
  GET,
  POST,
  Param,
  Body,
  Module,
  ClientGenerator,
  createClient,
} from '@dangao/bun-server';

@Controller('/api/users')
class UserController {
  @GET('/')
  public listUsers(): object {
    return [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }];
  }

  @GET('/:id')
  public getUser(@Param('id') id: string): object {
    return { id, name: 'Alice' };
  }

  @POST('/')
  public createUser(@Body() body: unknown): object {
    return { ...(body as object), id: '3' };
  }
}

@Module({ controllers: [UserController] })
class AppModule {}

const app = new Application({ port: 3001, enableSignalHandlers: false });
app.registerModule(AppModule);
await app.listen();

// 从已注册控制器生成路由清单
const manifest = ClientGenerator.generate();

// 创建类型安全客户端
const client = createClient(manifest, {
  baseUrl: 'http://localhost:3001',
});

// 调用 API
const users = await client.user.listUsers();
const user = await client.user.getUser({ params: { id: '42' } });
const newUser = await client.user.createUser({ body: { name: 'Charlie' } });

await app.stop();
```

`ClientRequestOptions` 支持 `params`、`query`、`body`、`headers`，路径中的 `:id` 等占位符会通过 `params` 自动替换。
