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
} from "bun-server";
```

即可在应用中使用。
