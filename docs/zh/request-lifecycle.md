# 请求生命周期

本文档详细说明 Bun Server 如何处理 HTTP 请求，从接收请求到发送响应的完整流程。

## 概览

```
HTTP Request
    ↓
┌─────────────────────────────────────┐
│           中间件管道                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│           安全过滤器                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│           路由匹配                   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│             守卫                     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         拦截器（前置）               │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       参数绑定 + 验证                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         控制器方法                   │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         拦截器（后置）               │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│           异常过滤器                 │
└─────────────────────────────────────┘
    ↓
HTTP Response
```

## 1. 中间件管道

请求到达时首先执行中间件。中间件可以在多个级别注册：

### 执行顺序

1. **全局中间件** - 通过 `app.use()` 注册
2. **模块中间件** - 在模块配置中定义
3. **控制器中间件** - 在类上使用 `@UseMiddleware()` 装饰
4. **方法中间件** - 在方法上使用 `@UseMiddleware()` 装饰

### 示例

```typescript
// 全局中间件
app.use(createLoggerMiddleware({ prefix: '[App]' }));
app.use(createCorsMiddleware({ origin: '*' }));

// 控制器级中间件
@Controller('/api')
@UseMiddleware(authMiddleware)
class ApiController {
  // 方法级中间件
  @GET('/admin')
  @UseMiddleware(adminOnlyMiddleware)
  public admin() {}
}
```

### 内置中间件

| 中间件 | 用途 |
|--------|------|
| `createLoggerMiddleware` | 请求/响应日志 |
| `createCorsMiddleware` | CORS 头部 |
| `createErrorHandlingMiddleware` | 全局错误处理 |
| `createRateLimitMiddleware` | 速率限制 |
| `createStaticFileMiddleware` | 静态文件服务 |
| `createFileUploadMiddleware` | 文件上传处理 |
| `createSessionMiddleware` | 会话管理 |
| `createHttpMetricsMiddleware` | HTTP 指标收集 |

### 何时使用中间件

- 横切关注点（日志、指标）
- 请求/响应转换
- 认证令牌提取
- CORS 处理
- 速率限制
- 静态文件服务

## 2. 安全过滤器

中间件之后，安全过滤器检查认证和授权。

### 流程

1. 检查路径是否在 `excludePaths` 中
2. 提取凭证（JWT、OAuth2 令牌）
3. 使用 `AuthenticationManager` 进行认证
4. 为请求设置 `SecurityContext`
5. 如果指定了 `@Auth({ roles: [...] })`，检查角色

### 配置

```typescript
SecurityModule.forRoot({
  jwt: {
    secret: 'your-secret-key',
    accessTokenExpiresIn: 3600,
  },
  oauth2Clients: [/* ... */],
  excludePaths: ['/public', '/health'],
});
```

### 使用方法

```typescript
@Controller('/api/users')
class UserController {
  @GET('/profile')
  @Auth() // 需要认证
  public getProfile() {
    const context = SecurityContextHolder.getContext();
    return context.getPrincipal();
  }

  @GET('/admin')
  @Auth({ roles: ['admin'] }) // 需要 admin 角色
  public adminOnly() {}
}
```

## 3. 路由匹配

路由器将请求路径和方法匹配到已注册的路由。

### 匹配优先级

1. **静态路由** - 精确路径匹配（`/api/users`）
2. **动态路由** - 带参数的路径（`/api/users/:id`）
3. **通配符路由** - 全匹配模式（`/api/*`）

### 路由注册

使用装饰器时自动注册路由：

```typescript
@Controller('/api/users')
class UserController {
  @GET('/:id')           // GET /api/users/:id
  public getUser() {}

  @POST('/')             // POST /api/users
  public createUser() {}

  @PUT('/:id')           // PUT /api/users/:id
  public updateUser() {}

  @DELETE('/:id')        // DELETE /api/users/:id
  public deleteUser() {}
}
```

## 4. 守卫

守卫在路由匹配之后、拦截器之前执行，提供细粒度的访问控制。它们可以访问 `ExecutionContext`，提供关于当前请求的丰富信息。

### 执行顺序

1. **全局守卫** - 通过 `SecurityModule.forRoot({ globalGuards: [...] })` 注册
2. **控制器守卫** - 通过 `@UseGuards()` 应用于控制器类
3. **方法守卫** - 通过 `@UseGuards()` 应用于方法

### 内置守卫

- `AuthGuard`：要求认证
- `OptionalAuthGuard`：可选认证
- `RolesGuard`：基于角色的授权（与 `@Roles()` 装饰器一起使用）

### 示例

```typescript
@Controller('/api/admin')
@UseGuards(AuthGuard, RolesGuard)
class AdminController {
  @GET('/dashboard')
  @Roles('admin')
  public dashboard() {
    return { message: '管理员仪表板' };
  }
}
```

详细文档请参阅 [守卫](./guards.md)。

## 5. 拦截器（前置处理）

拦截器在控制器方法之前和之后运行。前置拦截器按顺序执行：

1. **全局拦截器**
2. **控制器拦截器**
3. **方法拦截器**

### 示例

```typescript
@Injectable()
class LoggingInterceptor implements Interceptor {
  public async intercept(context: ExecutionContext, next: () => Promise<Response>): Promise<Response> {
    console.log('处理器之前...');
    const response = await next();
    console.log('处理器之后...');
    return response;
  }
}

@Controller('/api')
@UseInterceptors(LoggingInterceptor)
class ApiController {}
```

### 使用场景

- 日志记录
- 缓存
- 响应转换
- 性能监控

## 6. 参数绑定和验证

### 参数装饰器

| 装饰器 | 来源 | 示例 |
|--------|------|------|
| `@Param(name)` | URL 路径参数 | `/users/:id` → `@Param('id')` |
| `@Query(name)` | 查询字符串 | `?page=1` → `@Query('page')` |
| `@QueryMap()` | 所有查询参数 | `?page=1&limit=10` → `@QueryMap()` 返回 `{ page: '1', limit: '10' }` |
| `@Body()` | 请求体 | JSON 请求体 |
| `@Body(name)` | 请求体属性 | `body.name` → `@Body('name')` |
| `@Header(name)` | 请求头 | `@Header('Authorization')` |
| `@HeaderMap()` | 所有请求头 | `@HeaderMap()` 返回所有请求头作为对象 |
| `@Context()` | 完整上下文 | 请求上下文对象 |
| `@Session()` | 会话数据 | 会话对象 |

### 验证

使用 `@Validate()` 装饰器进行验证：

```typescript
@POST('/users')
public createUser(
  @Body('name') @Validate(IsString(), MinLength(3)) name: string,
  @Body('email') @Validate(IsEmail()) email: string,
  @Body('age') @Validate(IsNumber(), Min(0), Max(150)) age: number,
) {
  return { name, email, age };
}
```

### 内置验证器

| 验证器 | 描述 |
|--------|------|
| `IsString()` | 必须是字符串 |
| `IsNumber()` | 必须是数字 |
| `IsEmail()` | 必须是有效邮箱 |
| `MinLength(n)` | 最小字符串长度 |
| `MaxLength(n)` | 最大字符串长度 |
| `Min(n)` | 最小数值 |
| `Max(n)` | 最大数值 |
| `IsOptional()` | 字段可选 |
| `IsEnum(enum)` | 必须是枚举值 |
| `Matches(regex)` | 必须匹配模式 |

### 验证错误处理

验证失败时，抛出 `ValidationError` 并包含详细信息：

```json
{
  "status": 400,
  "message": "Validation failed",
  "issues": [
    {
      "field": "email",
      "message": "Must be a valid email address",
      "value": "invalid"
    }
  ]
}
```

## 7. 控制器方法执行

验证通过后，使用已解析的依赖和绑定的参数调用控制器方法。

### 依赖注入

通过构造函数注入服务：

```typescript
@Controller('/api/users')
class UserController {
  public constructor(
    private readonly userService: UserService,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
  ) {}

  @GET('/:id')
  public async getUser(@Param('id') id: string) {
    return await this.userService.findById(id);
  }
}
```

### 返回值

控制器方法可以返回：

- **普通对象** - 序列化为 JSON
- **Response** - 原生 Response 对象
- **void** - 空响应（204）
- **Promise** - 异步操作

## 8. 拦截器（后置处理）

处理器执行后，后置拦截器按相反顺序运行：

1. **方法拦截器**
2. **控制器拦截器**
3. **全局拦截器**

这允许拦截器转换响应：

```typescript
@Injectable()
class TransformInterceptor implements Interceptor {
  public async intercept(context: ExecutionContext, next: () => Promise<Response>): Promise<Response> {
    const response = await next();
    // 在此转换响应
    return new Response(JSON.stringify({
      data: await response.json(),
      timestamp: Date.now(),
    }));
  }
}
```

## 9. 异常过滤器

如果在请求生命周期中抛出任何异常，它会被异常过滤器捕获。

### 内置异常

| 异常 | 状态码 | 用途 |
|------|--------|------|
| `HttpException` | 自定义 | 基础异常类 |
| `BadRequestException` | 400 | 无效请求 |
| `UnauthorizedException` | 401 | 需要认证 |
| `ForbiddenException` | 403 | 拒绝访问 |
| `NotFoundException` | 404 | 资源未找到 |
| `ValidationError` | 400 | 验证失败 |

### 自定义异常过滤器

```typescript
ExceptionFilterRegistry.getInstance().register({
  catch(error: Error, context: Context): Response | undefined {
    if (error instanceof CustomException) {
      return context.createResponse(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return undefined; // 传递给下一个过滤器
  }
});
```

### 错误响应格式

默认错误响应遵循以下格式：

```json
{
  "status": 400,
  "message": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## 组件对比

| 组件 | 执行时机 | 使用场景 |
|------|----------|----------|
| **中间件** | 路由之前 | 横切关注点、请求转换 |
| **守卫** | 路由之后、处理器之前 | 认证、授权 |
| **拦截器** | 处理器之前/之后 | 日志、缓存、响应转换 |
| **管道** | 参数绑定 | 验证、转换 |
| **异常过滤器** | 异常发生时 | 错误处理 |

## 最佳实践

### 1. 中间件用于横切关注点

对适用于所有或大多数请求的关注点使用中间件：

```typescript
// 好：全局日志
app.use(createLoggerMiddleware({ prefix: '[App]' }));

// 好：所有 API 路由的 CORS
app.use(createCorsMiddleware({ origin: '*' }));
```

### 2. 守卫用于授权

对特定路由的授权使用安全装饰器：

```typescript
// 好：基于角色的访问控制
@Auth({ roles: ['admin'] })
@GET('/admin/dashboard')
public dashboard() {}
```

### 3. 拦截器用于响应转换

当需要修改响应时使用拦截器：

```typescript
// 好：为所有响应添加元数据
@UseInterceptors(ResponseMetadataInterceptor)
@Controller('/api')
class ApiController {}
```

### 4. 在参数级别验证

尽早验证，快速失败：

```typescript
// 好：在参数绑定时验证
@POST('/users')
public createUser(
  @Body('email') @Validate(IsEmail()) email: string,
) {}
```

### 5. 使用特定异常类型

抛出特定异常以便清晰地处理错误：

```typescript
// 好：特定异常
if (!user) {
  throw new NotFoundException('User not found');
}

// 避免：通用错误
if (!user) {
  throw new Error('Not found');
}
```

## 另请参阅

- [API 参考](./api.md)
- [使用指南](./guide.md)
- [错误处理](./error-handling.md)
- [安全认证](./guide.md#15-security-and-authentication)
