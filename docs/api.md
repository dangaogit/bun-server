# API Overview

This document provides an overview of the main APIs provided by Bun Server
Framework for quick reference.

## Core

| API                        | Description                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Application(options?)`    | Main application class, supports `use` for global middleware, `registerController`/`registerWebSocketGateway` for components, and `listen/stop` for lifecycle management |
| `Context`                  | Unified request context, wraps `Request` and provides methods like `getQuery/getParam/getBody/setHeader/setStatus/createResponse`                                        |
| `ResponseBuilder`          | Provides convenient response builders: `json/text/html/empty/redirect/error/file`                                                                                        |
| `RouteRegistry` / `Router` | Can directly register functional routes or get the underlying `Router` for manual control                                                                                |

## Controllers and Route Decorators

- `@Controller(path)`: Declare controller prefix.
- `@GET/@POST/@PUT/@PATCH/@DELETE(path)`: Declare HTTP methods.
- Parameter decorators:
  `@Body() / @Query(key) / @Param(key) / @Header(key) / @Session()`.
- `ControllerRegistry` automatically parses decorators and registers routes.

**Example**:

```typescript
@Controller("/api/users")
class UserController {
  @GET("/:id")
  public async getUser(@Param("id") id: string) {
    return { id, name: "User" };
  }

  @POST("/")
  public async createUser(@Body() user: CreateUserDto) {
    return await this.userService.create(user);
  }

  @GET("/")
  public async listUsers(@Query("page") page: number = 1) {
    return await this.userService.findAll(page);
  }
}
```

## Dependency Injection

- `Container`: `register`, `registerInstance`, `resolve`, `clear`,
  `isRegistered`.
- Decorators: `@Injectable(config?)` sets lifecycle, `@Inject(token?)` specifies
  dependencies.
- `Lifecycle` enum: `Singleton`, `Transient`, `Scoped` (reserved).

**Example**:

```typescript
@Injectable()
class UserService {
  public async find(id: string) {
    return { id, name: "User" };
  }
}

@Controller("/api/users")
class UserController {
  public constructor(
    @Inject(UserService) private readonly userService: UserService,
    @Inject(CACHE_SERVICE_TOKEN) private readonly cache: CacheService,
  ) {}

  @GET("/:id")
  public async getUser(@Param("id") id: string) {
    return await this.userService.find(id);
  }
}
```

## Extension System

### Middleware

- `Middleware` type:
  `(context: Context, next: NextFunction) => Response | Promise<Response>`
- `app.use(middleware)`: Register global middleware
- `@UseMiddleware(...middlewares)`: Controller or method-level middleware
- Built-in middleware factories: `createLoggerMiddleware`,
  `createCorsMiddleware`, `createErrorHandlingMiddleware`,
  `createFileUploadMiddleware`, `createStaticFileMiddleware`

### Application Extensions

- `ApplicationExtension` interface: `register(container: Container): void`
- `app.registerExtension(extension)`: Register application extension
- Official extensions: `LoggerExtension`, `SwaggerExtension`

### Module System

- `@Module(metadata)`: Module decorator
- `ModuleMetadata`: Supports `imports`, `controllers`, `providers`, `exports`,
  `extensions`, `middlewares`
- `app.registerModule(moduleClass)`: Register module
- Official modules: `ConfigModule.forRoot(options)`,
  `CacheModule.forRoot(options)`, `QueueModule.forRoot(options)`,
  `SessionModule.forRoot(options)`, `HealthModule.forRoot(options)`,
  `LoggerModule.forRoot(options)`, `SwaggerModule.forRoot(options)`

**Example**:

```typescript
// Configure modules
ConfigModule.forRoot({
  defaultConfig: { app: { name: "MyApp", port: 3000 } },
});

CacheModule.forRoot({
  defaultTtl: 3600000,
});

// Register modules
const app = new Application({ port: 3000 });
app.registerModule(ConfigModule);
app.registerModule(CacheModule);
app.registerModule(AppModule);
```

For detailed information, please refer to
[Extension System Documentation](./extensions.md).

## Middleware System

- `Middleware` type: `(context, next) => Response`.
- `MiddlewarePipeline`: `use`, `run`, `hasMiddlewares`, `clear`.
- `@UseMiddleware(...middlewares)`: Applied to controller classes or methods.
- Built-in middleware:
  - `createLoggerMiddleware`
  - `createRequestLoggingMiddleware`
  - `createCorsMiddleware`
  - `createErrorHandlingMiddleware`
  - `createFileUploadMiddleware`
  - `createStaticFileMiddleware`

## Validation

- Decorators: `@Validate(rule...)`, `IsString`, `IsNumber`, `IsEmail`,
  `IsOptional`, `MinLength`.
- `ValidationError`: `issues` array contains `index / rule / message`.
- `validateParameters(params, metadata)` can be reused in custom scenarios.

## Errors and Exceptions

- `HttpException` and subclasses: `BadRequestException`,
  `UnauthorizedException`, `ForbiddenException`, `NotFoundException`,
  `InternalServerErrorException`.
- `ExceptionFilter` interface and `ExceptionFilterRegistry`: Can register custom
  filters.
- `handleError(error, context)`: Core global error handling logic; default error
  middleware is automatically called.

## WebSocket

- Decorators: `@WebSocketGateway(path)` + `@OnOpen`, `@OnMessage`, `@OnClose`.
- `WebSocketGatewayRegistry`: Automatically manages dependency injection,
  registers when `Application.registerWebSocketGateway` is called.
- Server automatically handles handshakes and delegates events to gateway
  instances.

## Request Utilities

- `BodyParser`: `parse(request)`, automatically caches parsed results.
- `FileHandler`: Parses `multipart/form-data`, returns structured file objects.
- `RequestWrapper`: Lightweight wrapper for compatibility scenarios.

## Export Entry

All above APIs can be exported from `src/index.ts`, via

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

for use in applications.
