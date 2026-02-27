# 测试模块

Bun Server 提供 `TestingModule` 用于单元测试和集成测试，支持 provider 覆盖和 HTTP 客户端模拟。

## Test.createTestingModule()

使用 `Test.createTestingModule()` 创建测试模块，传入与 `@Module()` 相同的元数据：

```ts
import { Test, Controller, GET } from '@dangao/bun-server';

const module = await Test.createTestingModule({
  controllers: [UserController],
  providers: [UserService],
  imports: [ConfigModule.forRoot({ defaultConfig: {} })],
}).compile();
```

## Provider 覆盖

通过 `overrideProvider()` 链式调用覆盖依赖，支持三种方式：

- **useValue(value)**：使用固定值覆盖
- **useClass(cls)**：使用替代类覆盖
- **useFactory(factory)**：使用工厂函数覆盖

```ts
const mockService = { find: () => ({ id: '1', name: 'Mock' }) };

const module = await Test.createTestingModule({
  controllers: [UserController],
  providers: [UserService],
})
  .overrideProvider(UserService)
  .useValue(mockService)
  .compile();
```

## TestingModule 方法

- **get(token)**：从 DI 容器获取 provider 实例
- **createApplication(options?)**：创建 `Application` 实例并注册所有 providers、controllers
- **createHttpClient(options?)**：创建 HTTP 测试客户端，自动启动应用并返回 `TestHttpClient`

```ts
const service = module.get(UserService);
const app = module.createApplication();
const client = await module.createHttpClient();
```

## TestHttpClient

`createHttpClient()` 返回的客户端提供以下方法：

- **get(path, options?)**：GET 请求
- **post(path, options?)**：POST 请求
- **put(path, options?)**：PUT 请求
- **delete(path, options?)**：DELETE 请求
- **patch(path, options?)**：PATCH 请求
- **close()**：关闭测试服务器

`options` 支持 `headers`、`body`、`query`。响应对象包含 `status`、`headers`、`body`、`text`、`ok`。

## 配合 bun:test 使用

```ts
import { describe, test, expect } from 'bun:test';
import { Test, Controller, GET, Injectable } from '@dangao/bun-server';

@Injectable()
class Greeter {
  public greet(name: string): string {
    return `Hello, ${name}!`;
  }
}

@Controller('/api')
class GreetController {
  public constructor(private readonly greeter: Greeter) {}

  @GET('/greet')
  public greet(): object {
    return { message: this.greeter.greet('World') };
  }
}

describe('GreetController', () => {
  test('应返回问候消息', async () => {
    const module = await Test.createTestingModule({
      controllers: [GreetController],
      providers: [Greeter],
    }).compile();

    const client = await module.createHttpClient();
    const res = await client.get('/api/greet');
    await client.close();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Hello, World!' });
  });

  test('可使用 mock 覆盖 provider', async () => {
    const mockGreeter = { greet: (n: string) => `Mock: ${n}` };
    const module = await Test.createTestingModule({
      controllers: [GreetController],
      providers: [Greeter],
    })
      .overrideProvider(Greeter)
      .useValue(mockGreeter)
      .compile();

    const client = await module.createHttpClient();
    const res = await client.get('/api/greet');
    await client.close();

    expect(res.body).toEqual({ message: 'Mock: World' });
  });
});
```
