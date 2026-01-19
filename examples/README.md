# Bun Server Framework - Examples Index

[中文](./README_ZH.md) | **English**

This directory contains comprehensive examples for Bun Server Framework, organized by difficulty and feature category.

## 📚 Directory Structure

```
examples/
├── 00-quick-start/          # Quick Start (Get started in 5 minutes)
├── 01-core-features/        # Core Features (Deep dive into framework)
├── 02-official-modules/     # Official Modules (Ready-to-use)
├── 03-advanced/             # Advanced (Extending the framework)
└── 04-real-world/           # Real World (Production-ready examples)
```

## 🚀 Quick Start

### Recommended Learning Path

1. **Beginners** → Start with `00-quick-start`
2. **Experienced Developers** → Jump to `02-official-modules` or `04-real-world`
3. **Framework Contributors** → Check `03-advanced` for advanced features

---

## 📂 Category Details

### 00. Quick Start

**For**: Developers new to Bun Server

| File | Description | Difficulty | Port |
|------|-------------|------------|------|
| `01-hello-world.ts` | Minimal example: HTTP server in 5 lines | ⭐ | 3000 |
| `02-basic-routing.ts` | Routing basics: GET/POST/PUT/DELETE routes | ⭐ | 3000 |
| `03-dependency-injection.ts` | DI basics: `@Injectable` and constructor injection | ⭐⭐ | 3100 |

**Run**:
```bash
bun run examples/00-quick-start/01-hello-world.ts
```

---

### 01. Core Features

**For**: Developers who want to understand framework internals

| File | Description | Difficulty | Port |
|------|-------------|------------|------|
| `basic-app.ts` | Comprehensive: DI + Logger + Swagger + Config | ⭐⭐ | 3100 |
| `multi-module-app.ts` | Module system: dependencies and exports | ⭐⭐⭐ | 3300 |
| `basic-router.ts` | Low-level routing: using RouteRegistry directly | ⭐⭐ | 3000 |
| `context-scope-app.ts` | Request scoping: ContextService and Scoped lifecycle | ⭐⭐⭐ | 3500 |
| `full-app.ts` | Full features: validation, uploads, static files, WebSocket | ⭐⭐⭐ | 3200 |

**Core Concepts**:
- **Dependency Injection**: `@Injectable`, constructor injection, Symbol tokens
- **Module System**: `@Module`, imports/providers/exports
- **Middleware**: Global/controller/method-level middleware
- **Lifecycle**: Singleton vs Scoped

See [01-core-features/README.md](./01-core-features/README.md) for details.

---

### 02. Official Modules

**For**: Developers who need ready-to-use functionality

#### 🔐 Authentication & Security

| File | Description | Key Features | Port |
|------|-------------|--------------|------|
| `auth-app.ts` | SecurityModule: Complete JWT + OAuth2 | Login, token refresh, RBAC | 3000 |
| `session-app.ts` | SessionModule: Session management | Login state, shopping cart | 3400 |

**Key Points**:
- **JWT Authentication**: Access tokens, refresh tokens, expiration
- **OAuth2**: Authorization code flow, token exchange
- **Authorization**: `@Auth()` decorator, role-based access
- **Session**: Cookie management, session storage

#### 📊 Data & Caching

| File | Description | Key Features | Port |
|------|-------------|--------------|------|
| `database-app.ts` | DatabaseModule: SQLite database | Connection management, queries, health checks | 3000 |
| `orm-app.ts` | ORM: Entity + Repository pattern | Entity definition, CRUD operations | 3000 |
| `cache-app.ts` | CacheModule: Cache management | `@Cacheable`, `@CacheEvict`, `@CachePut` | 3200 |
| `transaction-app.ts` | Transaction management: Data consistency | `@Transactional` decorator | 3000 |

**Key Points**:
- **Database**: Connection pooling, parameterized queries, health checks
- **ORM**: Entity mapping, relationships, Repository pattern
- **Caching**: Decorator-based caching, manual caching, TTL strategies
- **Transactions**: ACID guarantees, rollback mechanisms

#### ⚙️ Background Tasks

| File | Description | Key Features | Port |
|------|-------------|--------------|------|
| `queue-app.ts` | QueueModule: Task queues | Job scheduling, Cron jobs | 3300 |

**Key Points**:
- **Task Queues**: Async tasks, priority queues
- **Scheduled Tasks**: Cron expressions, periodic execution
- **Job Handlers**: Register handlers, error handling

#### 📈 Monitoring & Documentation

| File | Description | Key Features | Port |
|------|-------------|--------------|------|
| `metrics-rate-limit-app.ts` | Monitoring & Rate Limiting | Prometheus metrics, API throttling | 3000 |

See [02-official-modules/README.md](./02-official-modules/README.md) for details.

**Run**:
```bash
# Auth example (with Web UI)
bun run examples/02-official-modules/auth-app.ts
# Visit http://localhost:3000

# Cache example
bun run examples/02-official-modules/cache-app.ts

# Queue example
bun run examples/02-official-modules/queue-app.ts
```

---

### 03. Advanced

**For**: Advanced developers who need to customize framework behavior

| File | Description | Tech Stack | Port |
|------|-------------|------------|------|
| `custom-decorator-app.ts` | Custom decorators: @Timing example | Metadata, Interceptor | 3000 |
| `advanced-decorator-app.ts` | Advanced decorators: Multiple decorator composition | Decorator chains, priorities | 3000 |
| `websocket-chat-app.ts` | Complete WebSocket chat with rooms (Web UI) | Rooms, broadcast, user list | 3600 |
| `microservice-app.ts` | Microservices architecture: Inter-service communication | Nacos, config center | Multiple |

**Key Points**:
- **Custom Decorators**: Metadata API, Reflect
- **Interceptors**: InterceptorRegistry, execution order
- **Microservices**: Service discovery, config management, load balancing

See [03-advanced/README.md](./03-advanced/README.md) for details.

**Example: Create custom decorator**
```typescript
// 1. Define Metadata Key
const TIMING_KEY = Symbol('@timing');

// 2. Create decorator
export function Timing(options: TimingOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(TIMING_KEY, options, target, propertyKey);
  };
}

// 3. Implement interceptor
class TimingInterceptor implements Interceptor {
  async execute(...) {
    const start = performance.now();
    const result = await originalMethod.apply(target, args);
    console.log(`Execution time: ${performance.now() - start}ms`);
    return result;
  }
}

// 4. Register interceptor
registry.register(TIMING_KEY, new TimingInterceptor(), 100);

// 5. Use decorator
@GET('/users')
@Timing({ label: 'Get Users' })
public getUsers() { ... }
```

---

### 04. Real World

**For**: Developers who need production-ready code references

| Directory | Description | Tech Stack |
|-----------|-------------|------------|
| `database-test-app.ts` | Database connection testing tool | Web UI, multi-database support |
| `perf/app.ts` | Performance benchmarking | High concurrency, optimization |

**Run**:
```bash
# Database testing tool (Web UI)
bun run examples/04-real-world/database-test-app.ts
# Visit http://localhost:3000

# Performance benchmarking
bun run examples/04-real-world/perf/app.ts
wrk -t4 -c64 -d30s http://localhost:3300/api/ping
```

---

## 🎯 Find Examples by Scenario

### Scenario 1: I want to quickly build a RESTful API

1. Start with `basic-app.ts` to understand basic structure
2. Reference `auth-app.ts` to add authentication
3. Use `cache-app.ts` to optimize performance
4. Check `database-app.ts` for database connection

### Scenario 2: I want to implement user authentication

1. See `auth-app.ts` (JWT + OAuth2)
2. Reference `session-app.ts` (Session management)
3. Learn `@Auth()` decorator usage

### Scenario 3: I want to use queues for async tasks

1. See `queue-app.ts` (Task queues + Cron)
2. Understand job handler registration
3. Learn Cron expressions

### Scenario 4: I want to customize framework behavior

1. Reference `custom-decorator-app.ts` (Custom decorators)
2. Learn `advanced-decorator-app.ts` (Decorator composition)
3. Study Interceptor mechanism

---

## 💡 Important Concepts

### Symbol + Interface Co-naming Pattern

This is a unique feature of Bun Server Framework that solves TypeScript's type erasure problem:

```typescript
// 1. Define interface
interface UserService {
  find(id: string): Promise<User | undefined>;
}

// 2. Define Symbol with the same name (DO NOT use import type)
const UserService = Symbol('UserService');

// 3. Implement interface
@Injectable()
class UserServiceImpl implements UserService {
  public async find(id: string) { ... }
}

// 4. Configure in Module
@Module({
  providers: [{
    provide: UserService,      // Symbol token
    useClass: UserServiceImpl, // Implementation
  }],
  exports: [UserServiceImpl],  // Export implementation
})

// 5. Inject and use
public constructor(
  // Type is interface UserService (compile-time)
  // Injected is Symbol('UserService') mapped instance (runtime)
  private readonly userService: UserService,
) {}
```

**Key Points**:
- ✅ Use `import { UserService }` (imports both Symbol and interface)
- ❌ **DO NOT** use `import type { UserService }` (imports only type, Symbol is lost)

### Default Constructor Injection

Framework supports decorator-free constructor injection (recommended):

```typescript
// ✅ Recommended: Direct type specification
public constructor(
  private readonly userService: UserService,
  private readonly productService: ProductService,
) {}

// ⚠️ Only needed when using Symbol tokens
public constructor(
  @Inject(USER_SERVICE_TOKEN) private readonly userService: UserService,
  @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
) {}
```

---

## 🔧 Common Issues

### Q1: Example fails with port already in use?

**A**: Use environment variable to specify port:
```bash
PORT=4000 bun run examples/basic-app.ts
```

### Q2: Dependency injection returns `undefined`?

**A**: Check the following:
1. Is `emitDecoratorMetadata` and `experimentalDecorators` enabled in `tsconfig.json`?
2. Did you use `import type`? (Symbol tokens cannot use import type)
3. Is the service registered in Module's `providers`?

### Q3: When to use Symbol + Interface pattern?

**A**: Recommended for:
- Interface-oriented programming (easier testing and swapping implementations)
- Multiple implementations (use different Symbols to distinguish)
- Exporting interfaces instead of implementation classes

### Q4: How to debug examples?

**A**: Use Bun's debugging features:
```bash
bun --inspect-brk examples/basic-app.ts
```

---

## 📖 Further Learning

- 📚 [API Documentation](../docs/api.md)
- 🎓 [User Guide](../docs/guide.md)
- 🏆 [Best Practices](../docs/best-practices.md)
- 🐛 [Troubleshooting](../docs/troubleshooting.md)
- 🔒 [Error Handling](../docs/error-handling.md)
- 🔑 [Symbol + Interface Pattern](../docs/symbol-interface-pattern.md)

---

## 🤝 Contributing Examples

We welcome more examples! Before submitting, ensure:

1. ✅ Code follows project conventions (see `.cursor/rules/code-style.mdc`)
2. ✅ Clear comments added (English)
3. ✅ Add index entry in this README
4. ✅ Test that examples run correctly

---

**Happy Coding! 🎉**
