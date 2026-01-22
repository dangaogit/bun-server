# API 概览

本文档概述 Bun Server Framework 目前提供的主要 API，方便快速查阅。

## 核心

| API                        | 描述                                                                                                                         |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `Application(options?)`    | 应用主类，支持 `use` 注册全局中间件、`registerController`/`registerWebSocketGateway` 注册组件以及 `listen/stop` 管理生命周期 |
| `BunServer(options?)`      | 底层服务器封装，提供对 Bun 服务器 API 的直接访问                                                                             |
| `Context`                  | 统一的请求上下文，封装 `Request` 并提供 `getQuery/getParam/getBody/setHeader/setStatus/createResponse` 等方法                |
| `ContextService`           | 用于在服务中访问请求上下文的服务，提供 `getContext()` 方法                                                                    |
| `ResponseBuilder`          | 提供 `json/text/html/empty/redirect/error/file` 便捷响应构建器                                                               |
| `RouteRegistry` / `Router` | 可直接注册函数式路由或获取底层 `Router` 进行手动控制                                                                         |

## 控制器与路由装饰器

- `@Controller(path)`：声明控制器前缀。
- `@GET/@POST/@PUT/@PATCH/@DELETE(path)`：声明 HTTP 方法。
- 参数装饰器：`@Body() / @Query(key) / @QueryMap() / @Param(key) / @Header(key) / @HeaderMap() / @Context()`。
- `ControllerRegistry` 会自动解析装饰器并注册路由。

## 依赖注入

- `Container`：`register`、`registerInstance`、`resolve`、`clear`、`isRegistered`。
- 装饰器：`@Injectable(config?)` 设置生命周期、`@Inject(token?)` 指定依赖。
- `Lifecycle` 枚举：`Singleton`、`Transient`、`Scoped`（预留）。

## 中间件体系

- `Middleware` 类型：`(context, next) => Response`。
- `MiddlewarePipeline`：`use`, `run`, `hasMiddlewares`, `clear`。
- `@UseMiddleware(...middlewares)`：作用于控制器类或方法。
- `@RateLimit(options)`：限流装饰器，可用于控制器或方法。
- 内置中间件：
  - `createLoggerMiddleware`
  - `createRequestLoggingMiddleware`
  - `createCorsMiddleware`
  - `createErrorHandlingMiddleware`
  - `createFileUploadMiddleware`
  - `createStaticFileMiddleware`
  - `createRateLimitMiddleware`

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

## 数据库模块

- `DatabaseModule.forRoot(options)`：配置数据库连接（PostgreSQL、MySQL、SQLite）
- `DatabaseService`：`query()`、`initialize()`、`closePool()`、`healthCheck()`、`getConnectionInfo()`
- `DATABASE_SERVICE_TOKEN`：依赖注入的 Token

**示例**：

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

## ORM 集成

- `@Entity(tableName)`：将类标记为数据库实体
- `@Column(options)`：定义列元数据
- `@PrimaryKey()`：将列标记为主键
- `@Repository(tableName, primaryKey)`：为实体创建仓库
- `BaseRepository<T>`：具有 CRUD 操作的基类仓库
- `DrizzleBaseRepository<T>`：Drizzle ORM 集成

**示例**：

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

## 事务支持

- `@Transactional(options?)`：声明方法为事务性
- `Propagation`：事务传播行为（REQUIRED、REQUIRES_NEW、SUPPORTS 等）
- `IsolationLevel`：事务隔离级别（READ_COMMITTED、REPEATABLE_READ 等）
- `TransactionManager`：手动管理事务

**示例**：

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
    // 此方法中的所有数据库操作都在事务中运行
    await this.db.query("INSERT INTO orders ...");
    await this.db.query("INSERT INTO order_items ...");
    // 如果任何操作失败，所有更改都会回滚
  }
}
```

## 缓存模块

- `CacheModule.forRoot(options)`：配置缓存
- `CacheService`：`get()`、`set()`、`delete()`、`getOrSet()`、`clear()`
- `@Cacheable(key?, ttl?)`：缓存方法结果
- `@CacheEvict(key?)`：清除缓存条目
- `@CachePut(key?, ttl?)`：更新缓存条目
- `CACHE_SERVICE_TOKEN`：依赖注入的 Token

**示例**：

```typescript
CacheModule.forRoot({
  defaultTtl: 3600000, // 1 小时
});

@Injectable()
class ProductService {
  public constructor(
    @Inject(CACHE_SERVICE_TOKEN) private readonly cache: CacheService,
  ) {}

  @Cacheable("product", 60000)
  public async getProduct(id: string) {
    // 昂贵的数据库查询
    return await this.db.query("SELECT * FROM products WHERE id = $1", [id]);
  }

  @CacheEvict("product")
  public async updateProduct(id: string, data: ProductData) {
    await this.db.query("UPDATE products ...");
  }
}
```

## 队列模块

- `QueueModule.forRoot(options)`：配置任务队列
- `QueueService`：`add()`、`get()`、`delete()`、`clear()`、`count()`
- `@Queue(name, options?)`：注册任务处理器
- `@Cron(cronExpression, options?)`：注册定时任务
- `QUEUE_SERVICE_TOKEN`：依赖注入的 Token

**示例**：

```typescript
QueueModule.forRoot({
  defaultRetries: 3,
});

@Injectable()
class EmailService {
  @Queue("send-email")
  public async sendEmail(data: { to: string; subject: string }) {
    // 发送邮件逻辑
  }

  @Cron("0 0 * * *") // 每天午夜
  public async sendDailyReport() {
    // 发送每日报告
  }
}
```

## 会话模块

- `SessionModule.forRoot(options)`：配置会话管理
- `SessionService`：`create()`、`get()`、`set()`、`delete()`、`touch()`
- `createSessionMiddleware()`：创建会话中间件
- `@Session()`：在控制器中注入会话对象
- `SESSION_SERVICE_TOKEN`：依赖注入的 Token

**示例**：

```typescript
SessionModule.forRoot({
  secret: "your-secret-key",
  maxAge: 3600000, // 1 小时
});

@Controller("/api/auth")
class AuthController {
  public constructor(
    @Inject(SESSION_SERVICE_TOKEN) private readonly session: SessionService,
  ) {}

  @POST("/login")
  public async login(@Body() credentials: LoginDto, @Session() session: any) {
    // Session 会自动注入
    session.userId = credentials.userId;
    return { success: true };
  }
}
```

## 健康检查模块

- `HealthModule.forRoot(options)`：配置健康检查
- `HealthIndicator`：自定义健康检查指示器
- 自动提供 `/health` 和 `/ready` 端点

**示例**：

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

## 指标模块

- `MetricsModule.forRoot(options)`：配置指标收集
- `MetricsCollector`：收集和暴露指标
- `PrometheusFormatter`：为 Prometheus 格式化指标
- `createHttpMetricsMiddleware()`：HTTP 指标中间件
- `METRICS_SERVICE_TOKEN`：依赖注入的 Token

**示例**：

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
    // 创建订单逻辑
  }
}
```

## 配置模块

- `ConfigModule.forRoot(options)`：配置管理
- `ConfigService`：`get()`、`set()`、`has()`、`getOrThrow()`
- `CONFIG_SERVICE_TOKEN`：依赖注入的 Token

**示例**：

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

## 请求工具

- `BodyParser`：`parse(request)`，自动缓存解析结果。
- `RequestWrapper`：用于兼容场景的轻量封装。
- `ResponseBuilder`：提供便捷的响应构建器。

## 文件处理

- `FileStorage`：文件存储服务，用于管理上传的文件。
- `createFileUploadMiddleware(options?)`：处理文件上传的中间件。
- `createStaticFileMiddleware(root, options?)`：提供静态文件服务的中间件。
- `UploadedFileInfo`：上传文件信息的类型定义。

## 安全模块

- `SecurityModule.forRoot(options)`：配置安全和认证
- `SecurityContextHolder`：访问当前安全上下文
- `AuthenticationManager`：管理认证
- `JwtAuthenticationProvider`：JWT 认证提供者
- `OAuth2AuthenticationProvider`：OAuth2 认证提供者
- `createSecurityFilter()`：创建安全过滤器中间件
- `RoleBasedAccessDecisionManager`：基于角色的访问控制

## 守卫系统

- `@UseGuards(...guards)`：将守卫应用于控制器或方法
- `@Roles(...roles)`：要求特定角色
- `AuthGuard`：要求认证
- `OptionalAuthGuard`：可选认证
- `RolesGuard`：基于角色的授权守卫
- `createRolesGuard(options)`：创建自定义角色守卫
- `GuardRegistry`：守卫中央注册表
- `ExecutionContext`：守卫的执行上下文
- `Reflector`：元数据反射工具

**示例**：

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

## 事件模块

- `EventModule.forRoot(options?)`：配置事件系统
- `EventEmitterService`：事件发射器服务
- `@OnEvent(event, options?)`：注册事件监听器方法
- `EventListenerScanner`：扫描并注册事件监听器
- `EVENT_EMITTER_TOKEN`：依赖注入的 Token

**示例**：

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
    // 发送通知
  }
}
```

## 微服务模块

### 配置中心模块

- `ConfigCenterModule.forRoot(options)`：配置配置中心（Nacos、Consul 等）
- `CONFIG_CENTER_TOKEN`：依赖注入的 Token
- `NacosConfigCenter`：Nacos 实现

**示例**：

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

### 服务注册中心模块

- `ServiceRegistryModule.forRoot(options)`：配置服务注册中心（Nacos、Consul 等）
- `SERVICE_REGISTRY_TOKEN`：依赖注入的 Token
- `NacosServiceRegistry`：Nacos 实现
- `@RegisterService(options)`：注册服务实例
- `@DiscoverService(serviceName)`：发现服务实例

**示例**：

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
    // 服务已注册
  }
}
```

### 服务客户端

- `ServiceClient`：服务间通信客户端
- `@ServiceClient(serviceName, options?)`：注入服务客户端
- `@ServiceCall(method, path, options?)`：声明服务调用
- 负载均衡器：`RandomLoadBalancer`、`RoundRobinLoadBalancer`、`WeightedRoundRobinLoadBalancer`、`ConsistentHashLoadBalancer`、`LeastActiveLoadBalancer`
- 拦截器：`TraceIdRequestInterceptor`、`UserInfoRequestInterceptor`、`RequestLogInterceptor` 等

**示例**：

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

### 治理

- `CircuitBreaker`：熔断器模式实现
- `RateLimiter`：服务调用限流
- `RetryStrategyImpl`：重试策略实现

### 链路追踪

- `Tracer`：分布式追踪
- `ConsoleTraceCollector`：基于控制台的追踪收集器
- `MemoryTraceCollector`：内存追踪收集器
- `SpanStatus`、`SpanKind`：Span 类型

### 监控

- `ServiceMetricsCollector`：服务调用指标收集
- `ServiceCallMetrics`：指标数据结构
- `ServiceInstanceHealth`：健康检查数据

## 导出入口

所有上述 API 均可从 `src/index.ts` 导出。完整的 API 列表请参考 `src/index.ts`。
