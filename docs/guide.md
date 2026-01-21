# Usage Guide

Covers key steps for building Bun Server applications from scratch.

## Request Lifecycle Overview

Before diving into implementation details, it's helpful to understand how Bun Server processes requests:

```
HTTP Request → Middleware → Security → Router → Interceptors(Pre) → Validation → Handler → Interceptors(Post) → Exception Filter → HTTP Response
```

For detailed lifecycle documentation, see [Request Lifecycle](./request-lifecycle.md).

## 1. Initialize Application

```ts
import "reflect-metadata";
import { Application } from "@dangao/bun-server";

const app = new Application({ port: 3000 });
app.listen();
```

> Tip: Default port is 3000, can be adjusted via `app.listen(customPort)` or
> `new Application({ port })`.

## 2. Register Controllers and Dependencies

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
  public findById(id: string) {
    return { id, name: "Alice" };
  }
}

@Controller("/api/users")
class UserController {
  public constructor(private readonly userService: UserService) {}

  @GET("/:id")
  public getUser(@Param("id") id: string) {
    return this.userService.findById(id);
  }
}

const app = new Application({ port: 3000 });
app.getContainer().register(UserService);
app.registerController(UserController);
app.listen();
```

## 3. Using Middleware

```ts
import {
  createCorsMiddleware,
  createLoggerMiddleware,
} from "@dangao/bun-server";

const app = new Application({ port: 3000 });

// Global middleware
app.use(createLoggerMiddleware({ prefix: "[App]" }));
app.use(createCorsMiddleware({ origin: "*" }));

// Custom middleware
app.use(async (ctx, next) => {
  console.log("Before request");
  const response = await next();
  console.log("After request");
  return response;
});
```

## 4. Parameter Validation

```ts
import { IsEmail, IsString, MinLength, Validate } from "@dangao/bun-server";

@Controller("/api/users")
class UserController {
  @POST("/")
  public createUser(
    @Body("name") @Validate(IsString(), MinLength(3)) name: string,
    @Body("email") @Validate(IsEmail()) email: string,
  ) {
    return { name, email };
  }
}
```

## 5. WebSocket Gateway

```ts
import { OnMessage, WebSocketGateway } from "@dangao/bun-server";

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

## 6. File Upload and Static Resources

```ts
import {
  createFileUploadMiddleware,
  createStaticFileMiddleware,
} from "@dangao/bun-server";

const app = new Application({ port: 3000 });

// File upload
app.use(createFileUploadMiddleware({ maxSize: 5 * 1024 * 1024 }));

// Static files
app.use(createStaticFileMiddleware({ root: "./public", prefix: "/assets" }));
```

## 7. Error Handling and Custom Filters

```ts
import { ExceptionFilterRegistry, HttpException } from "@dangao/bun-server";

@Controller("/api")
class ApiController {
  @GET("/error")
  public throwError() {
    throw new HttpException(400, "Bad Request");
  }
}

// Register custom exception filter
ExceptionFilterRegistry.register(HttpException, (error, ctx) => {
  return ctx.createResponse({ error: error.message }, { status: error.status });
});
```

## 8. Extension System

Bun Server provides multiple extension methods, including middleware,
application extensions, module system, etc. For detailed information, please
refer to [Extension System Documentation](./extensions.md).

### Quick Examples

#### Using Module Approach (Recommended)

```typescript
import {
  LoggerModule,
  LogLevel,
  Module,
  SwaggerModule,
} from "@dangao/bun-server";

// Configure modules
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

#### Using Extension Approach

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

#### Using Middleware

```typescript
import {
  createCorsMiddleware,
  createLoggerMiddleware,
} from "@dangao/bun-server";

const app = new Application({ port: 3000 });

app.use(createLoggerMiddleware({ prefix: "[App]" }));
app.use(createCorsMiddleware({ origin: "*" }));
```

For more extension methods and use cases, please refer to
[Extension System Documentation](./extensions.md).

### Advanced Example: Interface + Symbol + Module

This example demonstrates using interfaces with Symbol tokens and module-based
dependency injection for more flexible decoupled design:

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

// Define service interface
interface UserService {
  find(id: string): Promise<{ id: string; name: string } | undefined>;
  create(name: string): { id: string; name: string };
}

// Create Symbol token for DI
const UserService = Symbol("UserService");

// Implement the interface
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

// Define module with Symbol-based provider
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

// Configure modules
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: "Advanced App",
      port: 3100,
    },
  },
});

// Register module and start application
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

**Key points:**

- **Interface-based design**: Define contracts with TypeScript interfaces for
  better decoupling and testing
- **Symbol tokens**: Use `Symbol()` for type-safe dependency injection tokens,
  avoiding naming conflicts with string tokens
- **Module providers**: Register providers using
  `provide: Symbol, useClass: Implementation` to separate interface from
  implementation
- **Type-safe injection**: Use interface types directly in constructors, the
  framework will automatically resolve the implementation via Symbol token

This pattern is especially suitable for large projects, allowing easy
implementation replacement without affecting consumer code.

## 9. Database Integration

### Basic Database Connection

```ts
import {
  DATABASE_SERVICE_TOKEN,
  DatabaseModule,
  DatabaseService,
  Inject,
} from "@dangao/bun-server";

// Configure database
DatabaseModule.forRoot({
  database: {
    type: "postgres", // or 'mysql', 'sqlite'
    config: {
      host: "localhost",
      port: 5432,
      database: "mydb",
      user: "user",
      password: "password",
    },
  },
});

@Injectable()
class UserService {
  public constructor(
    @Inject(DATABASE_SERVICE_TOKEN) private readonly db: DatabaseService,
  ) {}

  public async findUser(id: string) {
    const result = await this.db.query("SELECT * FROM users WHERE id = $1", [
      id,
    ]);
    return result[0];
  }
}
```

### Using ORM with Drizzle

```ts
import {
  Column,
  DrizzleBaseRepository,
  Entity,
  PrimaryKey,
  Repository,
} from "@dangao/bun-server";

@Entity("users")
class User {
  @PrimaryKey()
  @Column({ type: "INTEGER", autoIncrement: true })
  public id!: number;

  @Column({ type: "TEXT", nullable: false })
  public name!: string;
}

@Repository("users", "id")
class UserRepository extends DrizzleBaseRepository<User> {}

@Injectable()
class UserService {
  public constructor(
    @Inject(UserRepository) private readonly repo: UserRepository,
  ) {}

  public async findAll() {
    return await this.repo.findAll();
  }
}
```

### Using Transactions

```ts
import { IsolationLevel, Propagation, Transactional } from "@dangao/bun-server";

@Injectable()
class OrderService {
  @Transactional({
    propagation: Propagation.REQUIRED,
    isolationLevel: IsolationLevel.READ_COMMITTED,
  })
  public async createOrder(orderData: OrderData) {
    // All database operations run in a transaction
    await this.db.query("INSERT INTO orders ...");
    await this.db.query("INSERT INTO order_items ...");
  }
}
```

## 10. Caching

```ts
import {
  CACHE_SERVICE_TOKEN,
  Cacheable,
  CacheEvict,
  CacheModule,
  CacheService,
} from "@dangao/bun-server";

CacheModule.forRoot({
  defaultTtl: 3600000, // 1 hour
});

@Injectable()
class ProductService {
  public constructor(
    @Inject(CACHE_SERVICE_TOKEN) private readonly cache: CacheService,
  ) {}

  @Cacheable("product", 60000)
  public async getProduct(id: string) {
    // Expensive operation - result is cached
    return await this.db.query("SELECT * FROM products WHERE id = $1", [id]);
  }

  @CacheEvict("product")
  public async updateProduct(id: string, data: ProductData) {
    await this.db.query("UPDATE products ...");
  }
}
```

## 11. Job Queue

```ts
import {
  Cron,
  Queue,
  QUEUE_SERVICE_TOKEN,
  QueueModule,
  QueueService,
} from "@dangao/bun-server";

QueueModule.forRoot({
  defaultRetries: 3,
});

@Injectable()
class EmailService {
  @Queue("send-email")
  public async sendEmail(data: { to: string; subject: string }) {
    // Email sending logic
  }

  @Cron("0 0 * * *") // Daily at midnight
  public async sendDailyReport() {
    // Send daily report
  }
}
```

## 12. Session Management

```ts
import {
  createSessionMiddleware,
  Session,
  SESSION_SERVICE_TOKEN,
  SessionModule,
  SessionService,
} from "@dangao/bun-server";

SessionModule.forRoot({
  secret: "your-secret-key",
  maxAge: 3600000, // 1 hour
});

// Add session middleware
app.use(createSessionMiddleware());

@Controller("/api/auth")
class AuthController {
  public constructor(
    @Inject(SESSION_SERVICE_TOKEN) private readonly session: SessionService,
  ) {}

  @POST("/login")
  public async login(@Body() credentials: LoginDto, @Session() session: any) {
    // Session is automatically injected
    session.userId = credentials.userId;
    return { success: true };
  }
}
```

## 13. Health Checks

```ts
import { HealthModule } from "@dangao/bun-server";

HealthModule.forRoot({
  indicators: [
    {
      name: "database",
      check: async () => {
        const isHealthy = await dbService.healthCheck();
        return { status: isHealthy ? "up" : "down" };
      },
    },
  ],
});

// Automatically provides /health and /ready endpoints
```

## 14. Metrics Collection

```ts
import {
  createHttpMetricsMiddleware,
  METRICS_SERVICE_TOKEN,
  MetricsCollector,
  MetricsModule,
} from "@dangao/bun-server";

MetricsModule.forRoot({
  enableHttpMetrics: true,
});

// Add metrics middleware
app.use(createHttpMetricsMiddleware());

@Injectable()
class OrderService {
  public constructor(
    @Inject(METRICS_SERVICE_TOKEN) private readonly metrics: MetricsCollector,
  ) {}

  public async createOrder() {
    this.metrics.increment("orders.created");
    // Create order logic
  }
}
```

## 15. Security and Authentication

```ts
import {
  Auth,
  SecurityContextHolder,
  SecurityModule,
} from "@dangao/bun-server";

SecurityModule.forRoot({
  jwt: {
    secret: "your-secret-key",
    accessTokenExpiresIn: 3600,
  },
});

@Controller("/api/users")
class UserController {
  @GET("/profile")
  @Auth() // Require authentication
  public getProfile() {
    const context = SecurityContextHolder.getContext();
    return context.getPrincipal();
  }

  @GET("/admin")
  @Auth({ roles: ["admin"] }) // Require admin role
  public getAdmin() {
    return { message: "Admin access" };
  }
}
```

## 16. Guards

Guards provide fine-grained access control for your routes. They execute after middleware and before interceptors, deciding whether a request should proceed.

### Built-in Guards

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
    return { message: "Admin Dashboard" };
  }

  @GET("/users")
  @Roles("admin", "moderator") // Either role grants access
  public listUsers() {
    return { users: [] };
  }
}
```

### Custom Guards

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

### Global Guards

```ts
SecurityModule.forRoot({
  jwt: { secret: "your-secret" },
  globalGuards: [AuthGuard], // Applied to all routes
});
```

For detailed documentation, see [Guards](./guards.md).

## 17. Event System

The Event Module provides a powerful event-driven architecture for building loosely coupled applications.

### Basic Usage

```ts
import {
  EventModule,
  Injectable,
  Inject,
  OnEvent,
  EVENT_EMITTER_TOKEN,
} from "@dangao/bun-server";
import type { EventEmitter } from "@dangao/bun-server";

// Define events
const USER_CREATED = Symbol("user.created");

interface UserCreatedEvent {
  userId: string;
  email: string;
}

// Service that publishes events
@Injectable()
class UserService {
  public constructor(
    @Inject(EVENT_EMITTER_TOKEN) private readonly eventEmitter: EventEmitter,
  ) {}

  public async createUser(email: string) {
    const userId = "user-123";

    // Publish event
    this.eventEmitter.emit<UserCreatedEvent>(USER_CREATED, {
      userId,
      email,
    });

    return { userId, email };
  }
}

// Service that listens to events
@Injectable()
class NotificationService {
  @OnEvent(USER_CREATED)
  public handleUserCreated(payload: UserCreatedEvent) {
    console.log(`Welcome email sent to ${payload.email}`);
  }

  @OnEvent(USER_CREATED, { async: true, priority: 10 })
  public async trackUserCreation(payload: UserCreatedEvent) {
    await this.analytics.track("user_created", payload);
  }
}
```

### Module Configuration

```ts
EventModule.forRoot({
  wildcard: true, // Enable wildcard matching
  maxListeners: 20, // Max listeners per event
  onError: (error, event, payload) => {
    console.error(`Error in event ${String(event)}:`, error);
  },
});

// Register listener classes
EventModule.registerListeners([NotificationService, AnalyticsService]);

@Module({
  imports: [EventModule],
  providers: [UserService, NotificationService, AnalyticsService],
})
class AppModule {}

const app = new Application();
app.registerModule(AppModule);

// Initialize event listeners after module registration
EventModule.initializeListeners(app.getContainer());
```

### Wildcard Events

```ts
// Match any user event: user.created, user.updated, user.deleted
@OnEvent("user.*")
handleAnyUserEvent(payload: unknown) {}

// Match nested events: order.created, order.item.added, order.payment.completed
@OnEvent("order.**")
handleAllOrderEvents(payload: unknown) {}
```

### Async Event Publishing

```ts
// Fire and forget (async listeners are triggered but not awaited)
this.eventEmitter.emit("order.created", orderData);

// Wait for all listeners to complete
await this.eventEmitter.emitAsync("order.created", orderData);
```

For detailed documentation, see [Event System](./events.md).

## 18. Global Modules

Global modules allow you to share providers across all modules without explicit imports. This is useful for commonly used services like configuration, logging, or caching.

### Creating a Global Module

Use the `@Global()` decorator to mark a module as global:

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

### Using Global Module Exports

Other modules can use the exported providers without importing the global module:

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

// UserModule does NOT need to import GlobalConfigModule
@Module({
  providers: [UserService],
})
class UserModule {}
```

### Registering Global Modules

Global modules must be registered with the application, typically in your root module:

```ts
@Module({
  imports: [
    GlobalConfigModule, // Register the global module once
    GlobalLoggerModule,
    UserModule, // UserModule can use ConfigService without importing it
    ProductModule,
  ],
})
class AppModule {}

const app = new Application();
app.registerModule(AppModule);
```

### Key Points

- **Single Registration**: Global modules only need to be registered once (usually in the root module)
- **Automatic Availability**: Exports from global modules are available to all other modules
- **Singleton Sharing**: Global module providers maintain singleton behavior across the application
- **No Import Required**: Other modules don't need to add global modules to their `imports` array

### Use Cases

Global modules are ideal for:

- **Configuration Services**: App-wide configuration access
- **Logging Services**: Centralized logging
- **Cache Services**: Shared caching layer
- **Database Connections**: Shared database access
- **Event Emitters**: Application-wide event bus

### Example: Multiple Global Modules

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

// App service can use both without explicit imports
@Injectable()
class AppService {
  public constructor(
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
    @Inject(CACHE_TOKEN) private readonly cache: CacheService,
  ) {}
}
```

## 19. Testing Recommendations

- Use `tests/utils/test-port.ts` to get auto-incrementing ports, avoiding local
  conflicts.
- Call `RouteRegistry.getInstance().clear()` and
  `ControllerRegistry.getInstance().clear()` in `afterEach` hooks to keep global
  state clean.
- In end-to-end tests, you can directly instantiate `Context` and call
  `router.handle(context)` without actually starting the server.
- For database integration tests, use environment variables (`POSTGRES_URL`,
  `MYSQL_URL`) to configure connections, tests will automatically skip if not
  configured.
