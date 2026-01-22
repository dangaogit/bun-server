# API Overview

This document provides an overview of the main APIs provided by Bun Server
Framework for quick reference.

## Core

| API                        | Description                                                                                                                                                              |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Application(options?)`    | Main application class, supports `use` for global middleware, `registerController`/`registerWebSocketGateway` for components, and `listen/stop` for lifecycle management |
| `BunServer(options?)`      | Low-level server wrapper, provides direct access to Bun's server API                                                                                                      |
| `Context`                  | Unified request context, wraps `Request` and provides methods like `getQuery/getParam/getBody/setHeader/setStatus/createResponse`                                        |
| `ContextService`           | Service for accessing request context in services, provides `getContext()` method                                                                                        |
| `ResponseBuilder`          | Provides convenient response builders: `json/text/html/empty/redirect/error/file`                                                                                        |
| `RouteRegistry` / `Router` | Can directly register functional routes or get the underlying `Router` for manual control                                                                                |

## Controllers and Route Decorators

- `@Controller(path)`: Declare controller prefix.
- `@GET/@POST/@PUT/@PATCH/@DELETE(path)`: Declare HTTP methods.
- Parameter decorators:
  `@Body() / @Query(key) / @QueryMap() / @Param(key) / @Header(key) / @HeaderMap() / @Context()`.
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

### Interceptor System

- `Interceptor` interface: Core interface for interceptors
- `InterceptorRegistry`: Central registry for managing interceptors
- `InterceptorChain`: Executes multiple interceptors in priority order
- `BaseInterceptor`: Base class for creating custom interceptors
- `scanInterceptorMetadata`: Scans method metadata for interceptors

**Built-in Interceptors**:
- `@Cache(options)`: Cache method results
- `@Permission(options)`: Check permissions before method execution
- `@Log(options)`: Log method execution with timing

**Example**:

```typescript
import { BaseInterceptor, INTERCEPTOR_REGISTRY_TOKEN } from '@dangao/bun-server';
import type { InterceptorRegistry } from '@dangao/bun-server';

// Create custom decorator
const MY_METADATA_KEY = Symbol('@my-app:my-decorator');

function MyDecorator(): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(MY_METADATA_KEY, true, target, propertyKey);
  };
}

// Create interceptor
class MyInterceptor extends BaseInterceptor {
  public async execute<T>(...): Promise<T> {
    // Pre-processing
    await this.before(...);
    
    // Execute original method
    const result = await Promise.resolve(originalMethod.apply(target, args));
    
    // Post-processing
    return await this.after(...) as T;
  }
}

// Register interceptor
const registry = app.getContainer().resolve<InterceptorRegistry>(INTERCEPTOR_REGISTRY_TOKEN);
registry.register(MY_METADATA_KEY, new MyInterceptor(), 100);

// Use decorator
@Controller('/api/users')
class UserController {
  @GET('/:id')
  @MyDecorator()
  public getUser(@Param('id') id: string) {
    return { id, name: 'User' };
  }
}
```

See [Custom Decorators Guide](./custom-decorators.md) for detailed documentation.
- Official modules: `ConfigModule.forRoot(options)`,
  `CacheModule.forRoot(options)`, `QueueModule.forRoot(options)`,
  `SessionModule.forRoot(options)`, `HealthModule.forRoot(options)`,
  `LoggerModule.forRoot(options)`, `SwaggerModule.forRoot(options)`,
  `DatabaseModule.forRoot(options)`, `MetricsModule.forRoot(options)`,
  `SecurityModule.forRoot(options)`

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
- `@RateLimit(options)`: Rate limiting decorator for controllers or methods.
- Built-in middleware:
  - `createLoggerMiddleware`
  - `createRequestLoggingMiddleware`
  - `createCorsMiddleware`
  - `createErrorHandlingMiddleware`
  - `createFileUploadMiddleware`
  - `createStaticFileMiddleware`
  - `createRateLimitMiddleware`

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
- `RequestWrapper`: Lightweight wrapper for compatibility scenarios.
- `ResponseBuilder`: Provides convenient response builders.

## File Handling

- `FileStorage`: File storage service for managing uploaded files.
- `createFileUploadMiddleware(options?)`: Middleware for handling file uploads.
- `createStaticFileMiddleware(root, options?)`: Middleware for serving static files.
- `UploadedFileInfo`: Type definition for uploaded file information.

## Database Module

- `DatabaseModule.forRoot(options)`: Configure database connection (PostgreSQL,
  MySQL, SQLite)
- `DatabaseService`: `query()`, `initialize()`, `closePool()`, `healthCheck()`,
  `getConnectionInfo()`
- `DATABASE_SERVICE_TOKEN`: Token for dependency injection

**Example**:

```typescript
DatabaseModule.forRoot({
  database: {
    type: "postgres",
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

## ORM Integration

- `@Entity(tableName)`: Mark class as database entity
- `@Column(options)`: Define column metadata
- `@PrimaryKey()`: Mark column as primary key
- `@Repository(tableName, primaryKey)`: Create repository for entity
- `BaseRepository<T>`: Base repository class with CRUD operations
- `DrizzleBaseRepository<T>`: Drizzle ORM integration

**Example**:

```typescript
@Entity("users")
class User {
  @PrimaryKey()
  @Column({ type: "INTEGER", autoIncrement: true })
  public id!: number;

  @Column({ type: "TEXT", nullable: false })
  public name!: string;

  @Column({ type: "TEXT", nullable: true })
  public email?: string;
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

## Transaction Support

- `@Transactional(options?)`: Declare method as transactional
- `Propagation`: Transaction propagation behavior (REQUIRED, REQUIRES_NEW,
  SUPPORTS, etc.)
- `IsolationLevel`: Transaction isolation level (READ_COMMITTED,
  REPEATABLE_READ, etc.)
- `TransactionManager`: Manually manage transactions

**Example**:

```typescript
@Injectable()
class OrderService {
  public constructor(
    @Inject(DATABASE_SERVICE_TOKEN) private readonly db: DatabaseService,
  ) {}

  @Transactional({
    propagation: Propagation.REQUIRED,
    isolationLevel: IsolationLevel.READ_COMMITTED,
  })
  public async createOrder(orderData: OrderData) {
    // All database operations in this method run in a transaction
    await this.db.query("INSERT INTO orders ...");
    await this.db.query("INSERT INTO order_items ...");
    // If any operation fails, all changes are rolled back
  }
}
```

## Cache Module

- `CacheModule.forRoot(options)`: Configure caching
- `CacheService`: `get()`, `set()`, `delete()`, `getOrSet()`, `clear()`
- `@Cacheable(key?, ttl?)`: Cache method result
- `@CacheEvict(key?)`: Evict cache entry
- `@CachePut(key?, ttl?)`: Update cache entry
- `CACHE_SERVICE_TOKEN`: Token for dependency injection

**Example**:

```typescript
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
    // Expensive database query
    return await this.db.query("SELECT * FROM products WHERE id = $1", [id]);
  }

  @CacheEvict("product")
  public async updateProduct(id: string, data: ProductData) {
    await this.db.query("UPDATE products ...");
  }
}
```

## Queue Module

- `QueueModule.forRoot(options)`: Configure job queue
- `QueueService`: `add()`, `get()`, `delete()`, `clear()`, `count()`
- `@Queue(name, options?)`: Register job handler
- `@Cron(cronExpression, options?)`: Register cron job
- `QUEUE_SERVICE_TOKEN`: Token for dependency injection

**Example**:

```typescript
QueueModule.forRoot({
  defaultRetries: 3,
});

@Injectable()
class EmailService {
  @Queue("send-email")
  public async sendEmail(data: { to: string; subject: string }) {
    // Send email logic
  }

  @Cron("0 0 * * *") // Daily at midnight
  public async sendDailyReport() {
    // Send daily report
  }
}
```

## Session Module

- `SessionModule.forRoot(options)`: Configure session management
- `SessionService`: `create()`, `get()`, `set()`, `delete()`, `touch()`
- `createSessionMiddleware()`: Create session middleware
- `@Session()`: Inject session object in controller
- `SESSION_SERVICE_TOKEN`: Token for dependency injection

**Example**:

```typescript
SessionModule.forRoot({
  secret: "your-secret-key",
  maxAge: 3600000, // 1 hour
});

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

## Health Module

- `HealthModule.forRoot(options)`: Configure health checks
- `HealthIndicator`: Custom health check indicator
- Automatically provides `/health` and `/ready` endpoints

**Example**:

```typescript
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
```

## Metrics Module

- `MetricsModule.forRoot(options)`: Configure metrics collection
- `MetricsCollector`: Collect and expose metrics
- `PrometheusFormatter`: Format metrics for Prometheus
- `createHttpMetricsMiddleware()`: HTTP metrics middleware
- `METRICS_SERVICE_TOKEN`: Token for dependency injection

**Example**:

```typescript
MetricsModule.forRoot({
  enableHttpMetrics: true,
});

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

## Config Module

- `ConfigModule.forRoot(options)`: Configure configuration management
- `ConfigService`: `get()`, `set()`, `has()`, `getOrThrow()`
- `CONFIG_SERVICE_TOKEN`: Token for dependency injection

**Example**:

```typescript
ConfigModule.forRoot({
  defaultConfig: { app: { name: "MyApp", port: 3000 } },
});

@Injectable()
class AppService {
  public constructor(
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
  ) {}

  public getPort() {
    return this.config.get<number>("app.port");
  }
}
```

## Security Module

- `SecurityModule.forRoot(options)`: Configure security and authentication
- `SecurityContextHolder`: Access current security context
- `AuthenticationManager`: Manage authentication
- `JwtAuthenticationProvider`: JWT authentication provider
- `OAuth2AuthenticationProvider`: OAuth2 authentication provider
- `createSecurityFilter()`: Create security filter middleware
- `RoleBasedAccessDecisionManager`: Role-based access control

**Example**:

```typescript
SecurityModule.forRoot({
  jwt: {
    secret: "your-secret-key",
    accessTokenExpiresIn: 3600,
  },
});

@Controller("/api/users")
class UserController {
  @GET("/profile")
  public getProfile() {
    const context = SecurityContextHolder.getContext();
    return context.getPrincipal();
  }
}
```

## Guards System

- `@UseGuards(...guards)`: Apply guards to controllers or methods
- `@Roles(...roles)`: Require specific roles
- `AuthGuard`: Require authentication
- `OptionalAuthGuard`: Optional authentication
- `RolesGuard`: Role-based authorization guard
- `createRolesGuard(options)`: Create custom roles guard
- `GuardRegistry`: Central registry for guards
- `ExecutionContext`: Execution context for guards
- `Reflector`: Metadata reflection utility

**Example**:

```typescript
@Controller("/api/users")
class UserController {
  @GET("/profile")
  @UseGuards(AuthGuard)
  public getProfile() {
    const context = SecurityContextHolder.getContext();
    return context.getPrincipal();
  }

  @GET("/admin")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles("admin")
  public getAdmin() {
    return { message: "Admin access" };
  }
}
```

## Events Module

- `EventModule.forRoot(options?)`: Configure event system
- `EventEmitterService`: Event emitter service
- `@OnEvent(event, options?)`: Register event listener method
- `EventListenerScanner`: Scans and registers event listeners
- `EVENT_EMITTER_TOKEN`: Token for dependency injection

**Example**:

```typescript
EventModule.forRoot({
  wildcard: true,
  maxListeners: 20,
});

@Injectable()
class NotificationService {
  public constructor(
    @Inject(EVENT_EMITTER_TOKEN) private readonly eventEmitter: EventEmitter,
  ) {}

  @OnEvent('user.created')
  public async handleUserCreated(data: { userId: string }) {
    // Send notification
  }
}
```

## Microservice Modules

### Config Center Module

- `ConfigCenterModule.forRoot(options)`: Configure config center (Nacos, Consul, etc.)
- `CONFIG_CENTER_TOKEN`: Token for dependency injection
- `NacosConfigCenter`: Nacos implementation

**Example**:

```typescript
ConfigCenterModule.forRoot({
  provider: 'nacos',
  nacos: {
    client: {
      serverList: 'localhost:8848',
      namespace: 'public',
    },
  },
});
```

### Service Registry Module

- `ServiceRegistryModule.forRoot(options)`: Configure service registry (Nacos, Consul, etc.)
- `SERVICE_REGISTRY_TOKEN`: Token for dependency injection
- `NacosServiceRegistry`: Nacos implementation
- `@RegisterService(options)`: Register service instance
- `@DiscoverService(serviceName)`: Discover service instances

**Example**:

```typescript
ServiceRegistryModule.forRoot({
  provider: 'nacos',
  nacos: {
    client: {
      serverList: 'localhost:8848',
    },
  },
});

@Injectable()
class MyService {
  @RegisterService({
    serviceName: 'my-service',
    ip: '127.0.0.1',
    port: 3000,
  })
  public start() {
    // Service registered
  }
}
```

### Service Client

- `ServiceClient`: Service-to-service communication client
- `@ServiceClient(serviceName, options?)`: Inject service client
- `@ServiceCall(method, path, options?)`: Declare service call
- Load balancers: `RandomLoadBalancer`, `RoundRobinLoadBalancer`, `WeightedRoundRobinLoadBalancer`, `ConsistentHashLoadBalancer`, `LeastActiveLoadBalancer`
- Interceptors: `TraceIdRequestInterceptor`, `UserInfoRequestInterceptor`, `RequestLogInterceptor`, etc.

**Example**:

```typescript
@Injectable()
class OrderService {
  @ServiceClient('user-service')
  private readonly userClient!: ServiceClient;

  @ServiceCall('GET', '/users/:id')
  public async getUser(id: string) {
    return await this.userClient.call('GET', `/users/${id}`);
  }
}
```

### Governance

- `CircuitBreaker`: Circuit breaker pattern implementation
- `RateLimiter`: Rate limiting for service calls
- `RetryStrategyImpl`: Retry strategy implementation

### Tracing

- `Tracer`: Distributed tracing
- `ConsoleTraceCollector`: Console-based trace collector
- `MemoryTraceCollector`: In-memory trace collector
- `SpanStatus`, `SpanKind`: Span types

### Monitoring

- `ServiceMetricsCollector`: Service call metrics collection
- `ServiceCallMetrics`: Metrics data structure
- `ServiceInstanceHealth`: Health check data

## Export Entry

All above APIs can be exported from `src/index.ts`. See the full export list in `src/index.ts` for complete API reference.
