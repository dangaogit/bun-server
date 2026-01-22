# 使用指南

涵盖从零开始构建 Bun Server 应用的关键步骤。

## 请求生命周期概览

在深入实现细节之前，了解 Bun Server 如何处理请求会很有帮助：

```
HTTP 请求 → 中间件 → 安全 → 路由 → 拦截器(前置) → 验证 → 处理器 → 拦截器(后置) → 异常过滤器 → HTTP 响应
```

详细的生命周期文档请参阅 [请求生命周期](./request-lifecycle.md)。

## 1. 初始化应用

```ts
import "reflect-metadata";
import { Application } from "@dangao/bun-server";

const app = new Application({ port: 3000 });
app.listen();
```

> Tip: 默认端口为 3000，可通过 `app.listen(customPort)` 或
> `new Application({ port })` 调整。

### 使用 BunServer（底层 API）

对于高级用例，您可以直接使用 `BunServer`：

```ts
import { BunServer } from "@dangao/bun-server";

const server = new BunServer({
  port: 3000,
  fetch: async (request) => {
    // 自定义请求处理
    return new Response("Hello World");
  },
});

server.listen();
```

### 在服务中访问请求上下文

使用 `ContextService` 在服务中访问当前请求上下文：

```ts
import {
  ContextService,
  CONTEXT_SERVICE_TOKEN,
  Inject,
  Injectable,
} from "@dangao/bun-server";

@Injectable()
class UserService {
  public constructor(
    @Inject(CONTEXT_SERVICE_TOKEN) private readonly contextService: ContextService,
  ) {}

  public getCurrentUser() {
    const ctx = this.contextService.getContext();
    const userId = ctx.getHeader("x-user-id");
    return { userId };
  }
}
```

## 2. 注册控制器与依赖

```ts
import {
  Application,
  Body,
  Controller,
  GET,
  Injectable,
  Param,
  POST,
} from "@dangao/bun-server";

@Injectable()
class UserService {
  private readonly users = new Map<string, string>([["1", "Alice"]]);
  public get(id: string) {
    return this.users.get(id);
  }
  public create(name: string) {
    const id = String(this.users.size + 1);
    this.users.set(id, name);
    return { id, name };
  }
}

@Controller("/api/users")
class UserController {
  public constructor(private readonly service: UserService) {}

  @GET("/:id")
  public getUser(@Param("id") id: string) {
    return this.service.get(id) ?? { error: "Not Found" };
  }

  @POST("/")
  public createUser(@Body() payload: { name: string }) {
    return this.service.create(payload.name);
  }
}

const app = new Application({ port: 3000 });
app.registerController(UserController);
app.listen();
```

### 高级参数绑定

Bun Server 支持高级参数绑定装饰器：

```ts
import {
  Body,
  Context,
  Controller,
  GET,
  Header,
  HeaderMap,
  Param,
  Query,
  QueryMap,
} from "@dangao/bun-server";

@Controller("/api/users")
class UserController {
  // 获取单个查询参数
  @GET("/search")
  public search(@Query("q") query: string) {
    return { query };
  }

  // 获取所有查询参数作为对象
  @GET("/filter")
  public filter(@QueryMap() params: Record<string, string>) {
    return { filters: params };
  }

  // 获取单个请求头
  @GET("/profile")
  public getProfile(@Header("authorization") token: string) {
    return { token };
  }

  // 获取所有请求头作为对象
  @GET("/headers")
  public getHeaders(@HeaderMap() headers: Record<string, string>) {
    return { headers };
  }

  // 获取完整的上下文对象
  @GET("/context")
  public getContext(@Context() ctx: Context) {
    return {
      method: ctx.getMethod(),
      path: ctx.getPath(),
      query: ctx.getQuery(),
    };
  }
}
```

## 3. 使用中间件

```ts
import {
  createCorsMiddleware,
  createLoggerMiddleware,
  createRateLimitMiddleware,
} from "@dangao/bun-server";

const app = new Application();
app.use(createLoggerMiddleware({ prefix: "[Example]" }));
app.use(createCorsMiddleware({ origin: "*" }));

// 限流中间件
app.use(
  createRateLimitMiddleware({
    windowMs: 60000, // 1 分钟
    max: 100, // 每个窗口 100 个请求
  }),
);
```

`@UseMiddleware()` 可作用于单个控制器或方法：

```ts
import { UseMiddleware } from "@dangao/bun-server";

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

### 限流装饰器

您也可以在控制器或方法上使用 `@RateLimit()` 装饰器：

```ts
import { Controller, GET, RateLimit } from "@dangao/bun-server";

@Controller("/api")
@RateLimit({ windowMs: 60000, max: 10 }) // 应用于所有方法
class ApiController {
  @GET("/public")
  public publicEndpoint() {
    return { message: "Public" };
  }

  @GET("/limited")
  @RateLimit({ windowMs: 60000, max: 5 }) // 覆盖控制器限制
  public limitedEndpoint() {
    return { message: "Limited" };
  }
}
```

## 4. 参数验证

```ts
import { Validate, IsEmail, MinLength } from "@dangao/bun-server";

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
import { OnMessage, WebSocketGateway } from "@dangao/bun-server";
import type { ServerWebSocket } from "bun";

@WebSocketGateway("/ws")
class ChatGateway {
  @OnMessage
  public handleMessage(ws: ServerWebSocket, message: string) {
    ws.send(`Echo: ${message}`);
  }
}

const app = new Application({ port: 3000 });
app.registerWebSocketGateway(ChatGateway);
app.listen();
```

## 6. 文件上传与静态资源

```ts
import {
  createFileUploadMiddleware,
  createStaticFileMiddleware,
  FileStorage,
  Inject,
  Injectable,
} from "@dangao/bun-server";

const app = new Application({ port: 3000 });

// 文件上传
app.use(createFileUploadMiddleware({ maxSize: 5 * 1024 * 1024 }));

// 静态文件
app.use(createStaticFileMiddleware({ root: "./public", prefix: "/assets" }));

// 使用 FileStorage 服务
@Injectable()
class FileService {
  public constructor(
    @Inject(FileStorage) private readonly fileStorage: FileStorage,
  ) {}

  public async saveFile(file: File): Promise<string> {
    const path = await this.fileStorage.save(file, {
      directory: "./uploads",
      filename: `file-${Date.now()}`,
    });
    return path;
  }
}
```

上传后的文件可在 `context.body.files` 中读取；静态资源请求会自动设置
Content-Type 与缓存头。

## 7. 错误处理与自定义过滤器

```ts
import { ExceptionFilterRegistry, HttpException } from "@dangao/bun-server";

ExceptionFilterRegistry.getInstance().register({
  catch(error, context) {
    if (error instanceof HttpException && error.status === 403) {
      return context.createResponse({ error: "No permission" }, {
        status: 403,
      });
    }
    return undefined;
  },
});
```

默认的 `createErrorHandlingMiddleware` 已自动添加到应用，确保异常均被捕获。

## 8. 扩展系统

Bun Server 提供了多种扩展方式，包括中间件、应用扩展、模块系统等。详细说明请参考
[扩展系统文档](./extensions.md)。

### 快速示例

#### 使用模块方式（推荐）

```typescript
import {
  LoggerModule,
  LogLevel,
  Module,
  SwaggerModule,
} from "@dangao/bun-server";

// 配置模块
LoggerModule.forRoot({
  logger: { prefix: "App", level: LogLevel.INFO },
  enableRequestLogging: true,
});

SwaggerModule.forRoot({
  info: { title: "API", version: "1.0.0" },
  uiPath: "/swagger",
});

@Module({
  imports: [LoggerModule, SwaggerModule],
  controllers: [UserController],
  providers: [UserService],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
```

#### 使用扩展方式

```typescript
import { LoggerExtension, SwaggerExtension } from "@dangao/bun-server";

const app = new Application({ port: 3000 });

app.registerExtension(new LoggerExtension({ prefix: "App" }));
app.registerExtension(
  new SwaggerExtension({
    info: { title: "API", version: "1.0.0" },
  }),
);
```

#### 使用中间件

```typescript
import {
  createCorsMiddleware,
  createLoggerMiddleware,
} from "@dangao/bun-server";

const app = new Application({ port: 3000 });

app.use(createLoggerMiddleware({ prefix: "[App]" }));
app.use(createCorsMiddleware({ origin: "*" }));
```

更多扩展方式和使用场景，请参考 [扩展系统文档](./extensions.md)。

### 进阶示例：接口 + Symbol + 模块

此示例演示如何使用接口配合 Symbol token
和基于模块的依赖注入，实现更灵活的解耦设计：

```typescript
import {
  Application,
  Body,
  CONFIG_SERVICE_TOKEN,
  ConfigModule,
  ConfigService,
  Controller,
  GET,
  Inject,
  Injectable,
  Module,
  Param,
  POST,
} from "@dangao/bun-server";

// 定义服务接口
interface UserService {
  find(id: string): Promise<{ id: string; name: string } | undefined>;
  create(name: string): { id: string; name: string };
}

// 创建 Symbol token 用于依赖注入
const UserService = Symbol("UserService");

// 实现接口
@Injectable()
class UserServiceImpl implements UserService {
  private readonly users = new Map<string, { id: string; name: string }>([
    ["1", { id: "1", name: "Alice" }],
  ]);

  public async find(id: string) {
    return this.users.get(id);
  }

  public create(name: string) {
    const id = String(this.users.size + 1);
    const user = { id, name };
    this.users.set(id, user);
    return user;
  }
}

@Controller("/api/users")
class UserController {
  public constructor(
    private readonly service: UserService,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
  ) {}

  @GET("/:id")
  public async getUser(@Param("id") id: string) {
    const user = await this.service.find(id);
    if (!user) {
      return { error: "Not Found" };
    }
    return user;
  }

  @POST("/")
  public createUser(@Body("name") name: string) {
    return this.service.create(name);
  }
}

// 使用 Symbol-based provider 定义模块
@Module({
  controllers: [UserController],
  providers: [
    {
      provide: UserService,
      useClass: UserServiceImpl,
    },
  ],
  exports: [UserService],
})
class UserModule {}

// 配置模块
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: "Advanced App",
      port: 3100,
    },
  },
});

// 注册模块并启动应用
@Module({
  imports: [ConfigModule],
  controllers: [UserController],
  providers: [
    {
      provide: UserService,
      useClass: UserServiceImpl,
    },
  ],
})
class AppModule {}

const app = new Application({ port: 3100 });
app.registerModule(AppModule);
app.listen();
```

**关键要点：**

- **基于接口的设计**：使用 TypeScript 接口定义服务契约，便于解耦和测试
- **Symbol token**：使用 `Symbol()` 创建类型安全的依赖注入 token，避免字符串
  token 的命名冲突
- **模块提供者**：使用 `provide: Symbol, useClass: Implementation`
  注册提供者，支持接口与实现分离
- **类型安全注入**：在构造函数中直接使用接口类型，框架会自动通过 Symbol token
  解析对应的实现

这种模式特别适合大型项目，可以轻松替换实现而不影响使用方代码。

## 9. 守卫（Guards）

守卫提供对路由的细粒度访问控制。它们在中间件之后、拦截器之前执行，决定请求是否应该继续。

### 内置守卫

```ts
import {
  AuthGuard,
  Controller,
  GET,
  Roles,
  RolesGuard,
  UseGuards,
} from "@dangao/bun-server";

@Controller("/api/admin")
@UseGuards(AuthGuard, RolesGuard)
class AdminController {
  @GET("/dashboard")
  @Roles("admin")
  public dashboard() {
    return { message: "管理员仪表板" };
  }

  @GET("/users")
  @Roles("admin", "moderator") // 任一角色即可访问
  public listUsers() {
    return { users: [] };
  }
}
```

### 自定义守卫

```ts
import { Injectable } from "@dangao/bun-server";
import type { CanActivate, ExecutionContext } from "@dangao/bun-server";

@Injectable()
class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.getHeader("x-api-key");
    return apiKey === "valid-api-key";
  }
}

@Controller("/api/external")
@UseGuards(ApiKeyGuard)
class ExternalApiController {
  @GET("/data")
  public getData() {
    return { data: [] };
  }
}
```

### 全局守卫

```ts
SecurityModule.forRoot({
  jwt: { secret: "your-secret" },
  globalGuards: [AuthGuard], // 应用于所有路由
});
```

详细文档请参阅 [守卫](./guards.md)。

## 10. 事件系统

事件模块提供了强大的事件驱动架构，用于构建松耦合的应用。

### 基本用法

```ts
import {
  EventModule,
  Injectable,
  Inject,
  OnEvent,
  EVENT_EMITTER_TOKEN,
} from "@dangao/bun-server";
import type { EventEmitter } from "@dangao/bun-server";

// 定义事件
const USER_CREATED = Symbol("user.created");

interface UserCreatedEvent {
  userId: string;
  email: string;
}

// 发布事件的服务
@Injectable()
class UserService {
  public constructor(
    @Inject(EVENT_EMITTER_TOKEN) private readonly eventEmitter: EventEmitter,
  ) {}

  public async createUser(email: string) {
    const userId = "user-123";

    // 发布事件
    this.eventEmitter.emit<UserCreatedEvent>(USER_CREATED, {
      userId,
      email,
    });

    return { userId, email };
  }
}

// 监听事件的服务
@Injectable()
class NotificationService {
  @OnEvent(USER_CREATED)
  public handleUserCreated(payload: UserCreatedEvent) {
    console.log(`欢迎邮件已发送至 ${payload.email}`);
  }

  @OnEvent(USER_CREATED, { async: true, priority: 10 })
  public async trackUserCreation(payload: UserCreatedEvent) {
    await this.analytics.track("user_created", payload);
  }
}
```

### 模块配置

```ts
EventModule.forRoot({
  wildcard: true, // 启用通配符匹配
  maxListeners: 20, // 每个事件的最大监听器数量
  onError: (error, event, payload) => {
    console.error(`事件 ${String(event)} 发生错误:`, error);
  },
});

// 注册监听器类
EventModule.registerListeners([NotificationService, AnalyticsService]);

@Module({
  imports: [EventModule],
  providers: [UserService, NotificationService, AnalyticsService],
})
class AppModule {}

const app = new Application();
app.registerModule(AppModule);

// 模块注册后初始化事件监听器
EventModule.initializeListeners(app.getContainer());
```

### 通配符事件

```ts
// 匹配任何用户事件: user.created, user.updated, user.deleted
@OnEvent("user.*")
handleAnyUserEvent(payload: unknown) {}

// 匹配嵌套事件: order.created, order.item.added, order.payment.completed
@OnEvent("order.**")
handleAllOrderEvents(payload: unknown) {}
```

### 异步事件发布

```ts
// 触发即忘（异步监听器被触发但不等待）
this.eventEmitter.emit("order.created", orderData);

// 等待所有监听器完成
await this.eventEmitter.emitAsync("order.created", orderData);
```

详细文档请参阅 [事件系统](./events.md)。

## 11. 全局模块

全局模块允许您在所有模块之间共享提供者，无需显式导入。这对于常用的服务（如配置、日志或缓存）非常有用。

### 创建全局模块

使用 `@Global()` 装饰器将模块标记为全局模块：

```ts
import { Global, Injectable, Module } from "@dangao/bun-server";

const CONFIG_TOKEN = Symbol("config");

@Injectable()
class ConfigService {
  public get(key: string): string {
    return `config:${key}`;
  }
}

@Global()
@Module({
  providers: [
    {
      provide: CONFIG_TOKEN,
      useClass: ConfigService,
    },
  ],
  exports: [CONFIG_TOKEN],
})
class GlobalConfigModule {}
```

### 使用全局模块导出

其他模块可以使用导出的提供者，无需导入全局模块：

```ts
@Injectable()
class UserService {
  public constructor(
    @Inject(CONFIG_TOKEN) private readonly config: ConfigService,
  ) {}

  public getAppName(): string {
    return this.config.get("app.name");
  }
}

// UserModule 不需要导入 GlobalConfigModule
@Module({
  providers: [UserService],
})
class UserModule {}
```

### 注册全局模块

全局模块必须在应用中注册，通常在根模块中：

```ts
@Module({
  imports: [
    GlobalConfigModule, // 只需注册一次全局模块
    GlobalLoggerModule,
    UserModule, // UserModule 可以使用 ConfigService，无需导入它
    ProductModule,
  ],
})
class AppModule {}

const app = new Application();
app.registerModule(AppModule);
```

### 关键要点

- **单次注册**：全局模块只需要注册一次（通常在根模块中）
- **自动可用**：全局模块的导出对所有其他模块自动可用
- **单例共享**：全局模块提供者在整个应用中保持单例行为
- **无需导入**：其他模块不需要将全局模块添加到其 `imports` 数组中

### 使用场景

全局模块非常适合：

- **配置服务**：全应用范围的配置访问
- **日志服务**：集中式日志记录
- **缓存服务**：共享缓存层
- **数据库连接**：共享数据库访问
- **事件发射器**：应用范围的事件总线

### 示例：多个全局模块

```ts
@Global()
@Module({
  providers: [{ provide: LOGGER_TOKEN, useClass: LoggerService }],
  exports: [LOGGER_TOKEN],
})
class GlobalLoggerModule {}

@Global()
@Module({
  providers: [{ provide: CACHE_TOKEN, useClass: CacheService }],
  exports: [CACHE_TOKEN],
})
class GlobalCacheModule {}

// AppService 可以使用两者，无需显式导入
@Injectable()
class AppService {
  public constructor(
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
    @Inject(CACHE_TOKEN) private readonly cache: CacheService,
  ) {}
}
```

## 12. 微服务支持

Bun Server 提供了完整的微服务架构支持，包括配置中心、服务注册与发现、服务调用、服务治理和可观测性等功能。

### 配置中心

```ts
import {
  ConfigCenterModule,
  CONFIG_CENTER_TOKEN,
  Inject,
  Injectable,
} from "@dangao/bun-server";
import type { ConfigCenter } from "@dangao/bun-server";

ConfigCenterModule.forRoot({
  provider: "nacos",
  nacos: {
    client: {
      serverList: ["http://localhost:8848"],
      namespace: "public",
    },
  },
});

@Injectable()
class ConfigService {
  public constructor(
    @Inject(CONFIG_CENTER_TOKEN) private readonly configCenter: ConfigCenter,
  ) {}

  public async getConfig() {
    const config = await this.configCenter.getConfig(
      "my-config",
      "DEFAULT_GROUP",
    );
    return JSON.parse(config.content);
  }
}
```

### 服务注册中心

```ts
import {
  RegisterService,
  ServiceRegistryModule,
} from "@dangao/bun-server";

ServiceRegistryModule.forRoot({
  provider: "nacos",
  nacos: {
    client: {
      serverList: ["http://localhost:8848"],
    },
  },
});

@Injectable()
class MyService {
  @RegisterService({
    serviceName: "my-service",
    ip: "127.0.0.1",
    port: 3000,
  })
  public start() {
    // 服务已注册
  }
}
```

### 服务客户端

```ts
import {
  ServiceClient,
  ServiceCall,
  Injectable,
} from "@dangao/bun-server";

@Injectable()
class OrderService {
  @ServiceClient("user-service")
  private readonly userClient!: ServiceClient;

  @ServiceCall("GET", "/users/:id")
  public async getUser(id: string) {
    return await this.userClient.call("GET", `/users/${id}`);
  }
}
```

详细文档请参阅 [微服务架构](./microservice.md)。

## 13. 测试建议

- 使用 `tests/utils/test-port.ts` 获取自增端口，避免本地冲突。
- 在 `afterEach` 钩子中调用 `RouteRegistry.getInstance().clear()` 和
  `ControllerRegistry.getInstance().clear()`，保持全局状态干净。
- 端到端测试中可直接实例化 `Context` 并调用
  `router.handle(context)`，无需真正启动服务器。
