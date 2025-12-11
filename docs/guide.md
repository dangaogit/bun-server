# Usage Guide

Covers key steps for building Bun Server applications from scratch.

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

## 16. Testing Recommendations

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
