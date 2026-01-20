# Core Features Examples

[中文](./README_ZH.md) | **English**

This directory contains examples demonstrating Bun Server Framework's core features and internal mechanics.

## 📚 Examples

| File | Description | Difficulty | Port |
|------|-------------|------------|------|
| `basic-app.ts` | Comprehensive example: DI + Logger + Swagger + Config | ⭐⭐ | 3100 |
| `multi-module-app.ts` | Module system: dependencies, imports/exports | ⭐⭐⭐ | 3300 |
| `basic-router.ts` | Low-level routing: using RouteRegistry directly | ⭐⭐ | 3000 |
| `context-scope-app.ts` | Request scoping: ContextService and Scoped lifecycle | ⭐⭐⭐ | 3500 |
| `full-app.ts` | Full features: validation, uploads, static files, WebSocket | ⭐⭐⭐ | 3200 |

## 🎯 Learning Path

### 1. Basic Introduction
Start with `basic-app.ts` to learn:
- ✅ Dependency injection basics (`@Injectable`, constructor injection)
- ✅ Module system (`@Module`, imports/providers/exports)
- ✅ Logger integration (LoggerModule)
- ✅ API documentation (SwaggerModule)
- ✅ Configuration management (ConfigModule)

**Run**:
```bash
bun run examples/01-core-features/basic-app.ts
```

**Access**:
- API: http://localhost:3100/api/users
- Swagger UI: http://localhost:3100/swagger

### 2. Module System Deep Dive
Learn `multi-module-app.ts`:
- ✅ Module dependencies (UserModule → ProductModule → OrderModule)
- ✅ Service imports and exports
- ✅ Cross-module dependency injection
- ✅ Module organization best practices

**Run**:
```bash
bun run examples/01-core-features/multi-module-app.ts
```

**Test**:
```bash
# Create order (depends on User and Product)
curl -X POST http://localhost:3300/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","productId":"1","quantity":2}'
```

### 3. Low-level Routing
Learn `basic-router.ts`:
- ✅ Direct RouteRegistry usage
- ✅ Manual route registration
- ✅ Context object usage
- ✅ Decorator-free route definition

**Use case**: Dynamic route registration or avoiding decorators

### 4. Request Scoping
Learn `context-scope-app.ts`:
- ✅ `Lifecycle.Scoped` lifecycle
- ✅ ContextService usage
- ✅ Request-level dependency isolation
- ✅ `@ContextParam()` decorator

**Key concept**:
```typescript
// Scoped service: one instance per request
@Injectable({ lifecycle: Lifecycle.Scoped })
class RequestIdService {
  public readonly requestId: string = crypto.randomUUID();
}

// Access current request Context in service layer
@Injectable()
class UserAgentService {
  constructor(
    @Inject(CONTEXT_SERVICE_TOKEN)
    private readonly contextService: ContextService
  ) {}
  
  getUserAgent() {
    return this.contextService.getHeader('User-Agent');
  }
}
```

### 5. Full Feature Integration
Learn `full-app.ts`:
- ✅ Middleware (CORS, logging, file upload, static files)
- ✅ Input validation (`@Validate` decorator)
- ✅ File upload handling
- ✅ WebSocket integration

**Run**:
```bash
bun run examples/01-core-features/full-app.ts
```

**Test**:
```bash
# 1. Search API (with validation)
curl http://localhost:3200/api/search?q=test
curl http://localhost:3200/api/search?q=a   # Validation error (min 2 chars)

# 2. Newsletter API (requires auth + email validation)
curl -X POST http://localhost:3200/api/newsletter/subscribe \
  -H "Authorization: demo-token" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 3. File Upload
echo "test content" > /tmp/test.txt
curl -X POST http://localhost:3200/api/files/upload \
  -F "file=@/tmp/test.txt"

# 4. Static Files (first create directory and file)
mkdir -p ./public
echo "Hello from static file" > ./public/test.txt
curl http://localhost:3200/assets/test.txt

# 5. WebSocket Chat
# Using websocat: websocat ws://localhost:3200/ws/chat
# Or browser console:
ws = new WebSocket('ws://localhost:3200/ws/chat')
ws.onmessage = (e) => console.log('Received:', e.data)
ws.send('Hello')
```

**Key Features**:
- **Middleware Pipeline**: Multiple middleware working together
- **Validation**: Declarative input validation with decorators
- **File Handling**: Upload and static file serving
- **Config-driven**: All settings from ConfigModule

## 💡 Core Concepts

### Dependency Injection (DI)

**Basic usage**:
```typescript
// 1. Define service
@Injectable()
class UserService {
  findAll() { return []; }
}

// 2. Inject service
@Controller('/users')
class UserController {
  constructor(
    private readonly userService: UserService  // Auto-injected
  ) {}
}

// 3. Register in container
@Module({
  providers: [UserService],
  controllers: [UserController],
})
class UserModule {}
```

**Symbol + Interface pattern**:
```typescript
// Define interface and Symbol with same name
interface UserService {
  findAll(): Promise<User[]>;
}
const UserService = Symbol('UserService');

// Implementation
@Injectable()
class UserServiceImpl implements UserService {
  async findAll() { return []; }
}

// Module configuration
@Module({
  providers: [{
    provide: UserService,      // Symbol token
    useClass: UserServiceImpl, // Implementation
  }],
})
```

See: [Symbol + Interface Pattern Guide](../../docs/symbol-interface-pattern.md)

### Module System

**Module organization**:
```typescript
@Module({
  imports: [SharedModule],     // Import other modules
  controllers: [UserController], // Controllers
  providers: [UserService],     // Services
  exports: [UserService],       // Export for other modules
})
class UserModule {}
```

**Module dependencies**:
```typescript
// OrderModule depends on UserModule and ProductModule
@Module({
  imports: [UserModule, ProductModule],
  controllers: [OrderController],
  providers: [OrderService],
})
class OrderModule {}
```

### Middleware

**Global middleware**:
```typescript
app.use(createLoggerMiddleware({ prefix: '[App]' }));
app.use(createCorsMiddleware({ origin: '*' }));
```

**Controller-level middleware**:
```typescript
@Controller('/api')
@UseMiddleware(authMiddleware)
class ApiController {}
```

**Method-level middleware**:
```typescript
@GET('/admin')
@UseMiddleware(adminOnlyMiddleware)
public admin() {}
```

### Lifecycle

| Lifecycle | Description | Use Cases |
|-----------|-------------|-----------|
| `Singleton` | Single instance (default) | Stateless services, config, utilities |
| `Transient` | New instance each time | Stateful services, temporary objects |
| `Scoped` | Request-scoped | Request-level data isolation |

```typescript
@Injectable({ lifecycle: Lifecycle.Scoped })
class RequestLogger {
  private readonly requestId = crypto.randomUUID();
}
```

## 🔧 Common Questions

### Q1: How to share services between modules?

**A**: Use `exports` to export services:
```typescript
// UserModule exports UserService
@Module({
  providers: [UserService],
  exports: [UserService],
})
class UserModule {}

// OrderModule imports UserModule
@Module({
  imports: [UserModule],  // Now can inject UserService
  controllers: [OrderController],
})
class OrderModule {}
```

### Q2: How does Scoped lifecycle work?

**A**: Creates new service instance per request, auto-destroyed after request:
```typescript
@Injectable({ lifecycle: Lifecycle.Scoped })
class RequestIdService {
  readonly id = crypto.randomUUID();
}

// Same request, multiple injections → same instance
// Different requests → different instances
```

### Q3: How to access current request Context?

**A**: Three methods:
```typescript
// 1. Parameter injection
@GET('/:id')
public getUser(@ContextParam() context: Context) {}

// 2. ContextService (recommended in service layer)
@Injectable()
class UserService {
  constructor(
    @Inject(CONTEXT_SERVICE_TOKEN)
    private readonly contextService: ContextService
  ) {}
  
  getUserAgent() {
    return this.contextService.getHeader('User-Agent');
  }
}

// 3. Direct access in middleware
async (ctx: Context, next: NextFunction) => {
  console.log(ctx.path);
  return await next();
}
```

## 📖 Further Reading

- 📚 [API Documentation](../../docs/api.md)
- 🎓 [User Guide](../../docs/guide.md)
- 🏆 [Best Practices](../../docs/best-practices.md)
- 🔑 [Symbol + Interface Pattern](../../docs/symbol-interface-pattern.md)

## ⬅️ Back

[← Back to Examples Index](../README.md)
