# API 概览

本文档概述 Bun Server Framework 目前提供的主要 API，方便快速查阅。

## 核心

| API                        | 描述                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Application(options?)`    | 应用主类，支持 `use` 注册全局中间件、`registerController`/`registerWebSocketGateway` 注册组件以及 `listen/stop` 管理生命周期 |
| `Context`                  | 统一的请求上下文，封装 `Request` 并提供 `getQuery/getParam/getBody/setHeader/setStatus/createResponse` 等方法                |
| `ResponseBuilder`          | 提供 `json/text/html/empty/redirect/error/file` 便捷响应构建器                                                               |
| `RouteRegistry` / `Router` | 可直接注册函数式路由或获取底层 `Router` 进行手动控制                                                                         |

## 控制器与路由装饰器

- `@Controller(path)`：声明控制器前缀。
- `@GET/@POST/@PUT/@PATCH/@DELETE(path)`：声明 HTTP 方法。
- 参数装饰器：`@Body() / @Query(key) / @Param(key) / @Header(key)`。
- `ControllerRegistry` 会自动解析装饰器并注册路由。

## 依赖注入

- `Container`：`register`、`registerInstance`、`resolve`、`clear`、`isRegistered`。
- 装饰器：`@Injectable(config?)` 设置生命周期、`@Inject(token?)` 指定依赖。
- `Lifecycle` 枚举：`Singleton`、`Transient`、`Scoped`（预留）。

## 中间件体系

- `Middleware` 类型：`(context, next) => Response`。
- `MiddlewarePipeline`：`use`, `run`, `hasMiddlewares`, `clear`。
- `@UseMiddleware(...middlewares)`：作用于控制器类或方法。
- 内置中间件：
  - `createLoggerMiddleware`
  - `createRequestLoggingMiddleware`
  - `createCorsMiddleware`
  - `createErrorHandlingMiddleware`
  - `createFileUploadMiddleware`
  - `createStaticFileMiddleware`

## 验证

- 装饰器：`@Validate(rule...)`, `IsString`, `IsNumber`, `IsEmail`, `IsOptional`,
  `MinLength`。
- `ValidationError`：`issues` 数组包含 `index / rule / message`。
- `validateParameters(params, metadata)` 可在自定义场景复用。

## 错误与异常

- `HttpException` 及子类：`BadRequestException`, `UnauthorizedException`,
  `ForbiddenException`, `NotFoundException`, `InternalServerErrorException`。
- `ExceptionFilter` 接口与 `ExceptionFilterRegistry`：可注册自定义过滤器。
- `handleError(error, context)`：全局错误处理核心逻辑；默认错误中间件已自动调用。

## 扩展系统

### 中间件

- `Middleware` 类型：`(context: Context, next: NextFunction) => Response | Promise<Response>`
- `app.use(middleware)`：注册全局中间件
- `@UseMiddleware(...middlewares)`：控制器或方法级中间件
- 内置中间件工厂函数：`createLoggerMiddleware`, `createCorsMiddleware`, `createErrorHandlingMiddleware`, `createFileUploadMiddleware`, `createStaticFileMiddleware`

### 应用扩展

- `ApplicationExtension` 接口：`register(container: Container): void`
- `app.registerExtension(extension)`：注册应用扩展
- 官方扩展：`LoggerExtension`, `SwaggerExtension`

### 模块系统

- `@Module(metadata)`：模块装饰器
- `ModuleMetadata`：支持 `imports`, `controllers`, `providers`, `exports`, `extensions`, `middlewares`
- `app.registerModule(moduleClass)`：注册模块
- 官方模块：`LoggerModule.forRoot(options)`, `SwaggerModule.forRoot(options)`

### 拦截器系统

- `Interceptor` 接口：拦截器核心接口
- `InterceptorRegistry`：拦截器中央注册表
- `InterceptorChain`：按优先级顺序执行多个拦截器
- `BaseInterceptor`：创建自定义拦截器的基类
- `scanInterceptorMetadata`：扫描方法元数据查找拦截器

**内置拦截器**：
- `@Cache(options)`：缓存方法结果
- `@Permission(options)`：在执行方法前检查权限
- `@Log(options)`：记录方法执行日志和耗时

**示例**：

```typescript
import { BaseInterceptor, INTERCEPTOR_REGISTRY_TOKEN } from '@dangao/bun-server';
import type { InterceptorRegistry } from '@dangao/bun-server';

// 创建自定义装饰器
const MY_METADATA_KEY = Symbol('@my-app:my-decorator');

function MyDecorator(): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(MY_METADATA_KEY, true, target, propertyKey);
  };
}

// 创建拦截器
class MyInterceptor extends BaseInterceptor {
  public async execute<T>(...): Promise<T> {
    // 前置处理
    await this.before(...);
    
    // 执行原方法
    const result = await Promise.resolve(originalMethod.apply(target, args));
    
    // 后置处理
    return await this.after(...) as T;
  }
}

// 注册拦截器
const registry = app.getContainer().resolve<InterceptorRegistry>(INTERCEPTOR_REGISTRY_TOKEN);
registry.register(MY_METADATA_KEY, new MyInterceptor(), 100);

// 使用装饰器
@Controller('/api/users')
class UserController {
  @GET('/:id')
  @MyDecorator()
  public getUser(@Param('id') id: string) {
    return { id, name: 'User' };
  }
}
```

详细说明请参考 [自定义注解开发指南](./custom-decorators.md)。

详细说明请参考 [扩展系统文档](./extensions.md)。

## WebSocket

- 装饰器：`@WebSocketGateway(path)` + `@OnOpen`, `@OnMessage`, `@OnClose`。
- `WebSocketGatewayRegistry`：自动管理依赖注入、在
  `Application.registerWebSocketGateway` 时登记。
- 服务器会自动处理握手并将事件委托给网关实例。

## 请求工具

- `BodyParser`：`parse(request)`，自动缓存解析结果。
- `FileHandler`：解析 `multipart/form-data`，返回结构化文件对象。
- `RequestWrapper`：用于兼容场景的轻量封装。

## 导出入口

所有上述 API 均可从 `src/index.ts` 导出，通过

```ts
import {
  Application,
  Controller,
  createLoggerMiddleware,
  GET,
  HttpException,
  Injectable,
  UseMiddleware,
  Validate,
  WebSocketGateway,
} from "@dangao/bun-server";
```

即可在应用中使用。
