# Request Lifecycle

This document provides a detailed explanation of how Bun Server processes HTTP requests, from the moment a request is received to when a response is sent.

## Overview

```
HTTP Request
    ↓
┌─────────────────────────────────────┐
│         Middleware Pipeline         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         Security Filter             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         Router Matching             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│              Guards                 │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       Interceptors (Pre)            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│   Parameter Binding + Validation    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       Controller Method             │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       Interceptors (Post)           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       Exception Filter              │
└─────────────────────────────────────┘
    ↓
HTTP Response
```

## 1. Middleware Pipeline

Middleware is executed first when a request arrives. Middleware can be registered at multiple levels:

### Execution Order

1. **Global Middleware** - Registered via `app.use()`
2. **Module Middleware** - Defined in module configuration
3. **Controller Middleware** - Decorated with `@UseMiddleware()` on class
4. **Method Middleware** - Decorated with `@UseMiddleware()` on method

### Example

```typescript
// Global middleware
app.use(createLoggerMiddleware({ prefix: '[App]' }));
app.use(createCorsMiddleware({ origin: '*' }));

// Controller-level middleware
@Controller('/api')
@UseMiddleware(authMiddleware)
class ApiController {
  // Method-level middleware
  @GET('/admin')
  @UseMiddleware(adminOnlyMiddleware)
  public admin() {}
}
```

### Built-in Middleware

| Middleware | Purpose |
|------------|---------|
| `createLoggerMiddleware` | Request/response logging |
| `createCorsMiddleware` | CORS headers |
| `createErrorHandlingMiddleware` | Global error handling |
| `createRateLimitMiddleware` | Rate limiting |
| `createHttpMetricsMiddleware` | HTTP metrics collection |
| `createStaticFileMiddleware` | Static file serving |
| `createFileUploadMiddleware` | File upload handling |
| `createSessionMiddleware` | Session management |
| `createHttpMetricsMiddleware` | HTTP metrics collection |

### When to Use Middleware

- Cross-cutting concerns (logging, metrics)
- Request/response transformation
- Authentication token extraction
- CORS handling
- Rate limiting
- Static file serving

## 2. Security Filter

After middleware, the security filter checks authentication and authorization.

### Flow

1. Check if path is in `excludePaths`
2. Extract credentials (JWT, OAuth2 token)
3. Authenticate using `AuthenticationManager`
4. Set `SecurityContext` for the request
5. Check roles if `@Auth({ roles: [...] })` is specified

### Configuration

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

### Usage

```typescript
@Controller('/api/users')
class UserController {
  @GET('/profile')
  @Auth() // Requires authentication
  public getProfile() {
    const context = SecurityContextHolder.getContext();
    return context.getPrincipal();
  }

  @GET('/admin')
  @Auth({ roles: ['admin'] }) // Requires admin role
  public adminOnly() {}
}
```

## 3. Router Matching

The router matches the request path and method to a registered route.

## 4. Guards

Guards execute after routing and before interceptors, providing fine-grained access control. They have access to the `ExecutionContext` which provides rich information about the current request.

### Execution Order

1. **Global Guards** - Registered via `SecurityModule.forRoot({ globalGuards: [...] })`
2. **Controller Guards** - Applied via `@UseGuards()` on controller class
3. **Method Guards** - Applied via `@UseGuards()` on method

### Built-in Guards

- `AuthGuard`: Requires authentication
- `OptionalAuthGuard`: Optional authentication
- `RolesGuard`: Role-based authorization (used with `@Roles()` decorator)

### Example

```typescript
@Controller('/api/admin')
@UseGuards(AuthGuard, RolesGuard)
class AdminController {
  @GET('/dashboard')
  @Roles('admin')
  public dashboard() {
    return { message: 'Admin Dashboard' };
  }
}
```

For detailed documentation, see [Guards](./guards.md).

## 5. Interceptors (Pre-processing)

### Matching Priority

1. **Static Routes** - Exact path match (`/api/users`)
2. **Dynamic Routes** - Path with parameters (`/api/users/:id`)
3. **Wildcard Routes** - Catch-all patterns (`/api/*`)

### Route Registration

Routes are automatically registered when you use decorators:

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

## 4. Interceptors (Pre-processing)

Interceptors run before and after the controller method. Pre-interceptors execute in order:

1. **Global Interceptors**
2. **Controller Interceptors**
3. **Method Interceptors**

### Example

```typescript
@Injectable()
class LoggingInterceptor implements Interceptor {
  public async intercept(context: ExecutionContext, next: () => Promise<Response>): Promise<Response> {
    console.log('Before handler...');
    const response = await next();
    console.log('After handler...');
    return response;
  }
}

@Controller('/api')
@UseInterceptors(LoggingInterceptor)
class ApiController {}
```

### Use Cases

- Logging
- Caching
- Response transformation
- Performance monitoring

## 6. Parameter Binding and Validation

### Parameter Decorators

| Decorator | Source | Example |
|-----------|--------|---------|
| `@Param(name)` | URL path parameter | `/users/:id` → `@Param('id')` |
| `@Query(name)` | Query string | `?page=1` → `@Query('page')` |
| `@QueryMap()` | All query parameters | `?page=1&limit=10` → `@QueryMap()` returns `{ page: '1', limit: '10' }` |
| `@Body()` | Request body | JSON body |
| `@Body(name)` | Body property | `body.name` → `@Body('name')` |
| `@Header(name)` | Request header | `@Header('Authorization')` |
| `@HeaderMap()` | All headers | `@HeaderMap()` returns all headers as object |
| `@Context()` | Full context | Request context object |
| `@Session()` | Session data | Session object |

### Validation

Validation is performed using the `@Validate()` decorator:

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

### Built-in Validators

| Validator | Description |
|-----------|-------------|
| `IsString()` | Must be a string |
| `IsNumber()` | Must be a number |
| `IsEmail()` | Must be valid email |
| `MinLength(n)` | Minimum string length |
| `MaxLength(n)` | Maximum string length |
| `Min(n)` | Minimum number value |
| `Max(n)` | Maximum number value |
| `IsOptional()` | Field is optional |
| `IsEnum(enum)` | Must be enum value |
| `Matches(regex)` | Must match pattern |

### Validation Error Handling

When validation fails, a `ValidationError` is thrown with detailed information:

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

## 7. Controller Method Execution

After validation, the controller method is invoked with resolved dependencies and bound parameters.

### Dependency Injection

Services are injected via constructor:

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

### Return Values

Controller methods can return:

- **Plain objects** - Serialized as JSON
- **Response** - Native Response object
- **void** - Empty response (204)
- **Promise** - Async operations

## 8. Interceptors (Post-processing)

After the handler executes, post-interceptors run in reverse order:

1. **Method Interceptors**
2. **Controller Interceptors**
3. **Global Interceptors**

This allows interceptors to transform the response:

```typescript
@Injectable()
class TransformInterceptor implements Interceptor {
  public async intercept(context: ExecutionContext, next: () => Promise<Response>): Promise<Response> {
    const response = await next();
    // Transform response here
    return new Response(JSON.stringify({
      data: await response.json(),
      timestamp: Date.now(),
    }));
  }
}
```

## 9. Exception Filter

If any exception is thrown during the request lifecycle, it's caught by the exception filter.

### Built-in Exceptions

| Exception | Status Code | Usage |
|-----------|-------------|-------|
| `HttpException` | Custom | Base exception class |
| `BadRequestException` | 400 | Invalid request |
| `UnauthorizedException` | 401 | Authentication required |
| `ForbiddenException` | 403 | Access denied |
| `NotFoundException` | 404 | Resource not found |
| `ValidationError` | 400 | Validation failed |

### Custom Exception Filter

```typescript
ExceptionFilterRegistry.getInstance().register({
  catch(error: Error, context: Context): Response | undefined {
    if (error instanceof CustomException) {
      return context.createResponse(
        { error: error.message, code: error.code },
        { status: error.status }
      );
    }
    return undefined; // Pass to next filter
  }
});
```

### Error Response Format

Default error responses follow this format:

```json
{
  "status": 400,
  "message": "Error message",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Component Comparison

| Component | Execution Point | Use Case |
|-----------|-----------------|----------|
| **Middleware** | Before routing | Cross-cutting concerns, request transformation |
| **Guards** | After routing, before handler | Authentication, authorization |
| **Interceptors** | Before/after handler | Logging, caching, response transformation |
| **Pipes** | Parameter binding | Validation, transformation |
| **Exception Filters** | On exception | Error handling |

## Best Practices

### 1. Middleware for Cross-Cutting Concerns

Use middleware for concerns that apply to all or most requests:

```typescript
// Good: Global logging
app.use(createLoggerMiddleware({ prefix: '[App]' }));

// Good: CORS for all API routes
app.use(createCorsMiddleware({ origin: '*' }));
```

### 2. Guards for Authorization

Use security decorators for route-specific authorization:

```typescript
// Good: Role-based access control
@Auth({ roles: ['admin'] })
@GET('/admin/dashboard')
public dashboard() {}
```

### 3. Interceptors for Response Transformation

Use interceptors when you need to modify responses:

```typescript
// Good: Add metadata to all responses
@UseInterceptors(ResponseMetadataInterceptor)
@Controller('/api')
class ApiController {}
```

### 4. Validation at Parameter Level

Validate early and fail fast:

```typescript
// Good: Validate at parameter binding
@POST('/users')
public createUser(
  @Body('email') @Validate(IsEmail()) email: string,
) {}
```

### 5. Specific Exception Types

Throw specific exceptions for clear error handling:

```typescript
// Good: Specific exception
if (!user) {
  throw new NotFoundException('User not found');
}

// Avoid: Generic error
if (!user) {
  throw new Error('Not found');
}
```

## See Also

- [API Reference](./api.md)
- [Usage Guide](./guide.md)
- [Error Handling](./error-handling.md)
- [Security](./guide.md#15-security-and-authentication)
