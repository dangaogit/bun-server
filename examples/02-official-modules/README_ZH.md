# 官方模块示例

**中文** | [English](./README.md)

本目录包含 Bun Server Framework 官方模块的完整示例，帮助你快速集成各种开箱即用的功能。

## 📚 模块分类

### 🔐 认证与安全

| 文件 | 模块 | 核心功能 | 难度 | 端口 |
|------|------|---------|------|------|
| `auth-app.ts` | SecurityModule | JWT + OAuth2 认证、权限控制 | ⭐⭐⭐ | 3000 |
| `session-app.ts` | SessionModule | Session 管理、Cookie 处理 | ⭐⭐ | 3400 |

### 📊 数据与缓存

| 文件 | 模块 | 核心功能 | 难度 | 端口 |
|------|------|---------|------|------|
| `database-app.ts` | DatabaseModule | SQLite 连接、查询、健康检查 | ⭐⭐ | 3000 |
| `nacos-auto-register-app.ts` | ServiceRegistryModule | Nacos 自动注册开关 | ⭐⭐ | 3010 |
| `orm-app.ts` | DatabaseModule (ORM) | Entity、Repository 模式 | ⭐⭐⭐ | 3000 |
| `cache-app.ts` | CacheModule | 缓存装饰器、手动缓存 | ⭐⭐ | 3200 |
| `transaction-app.ts` | DatabaseModule (事务) | `@Transactional` 装饰器 | ⭐⭐⭐ | 3000 |

### ⚙️ 后台任务

| 文件 | 模块 | 核心功能 | 难度 | 端口 |
|------|------|---------|------|------|
| `queue-app.ts` | QueueModule | 任务队列、Cron 定时任务 | ⭐⭐⭐ | 3300 |
| `events-app.ts` | EventModule | 事件驱动架构 | ⭐⭐ | 3400 |

### 📈 监控与限流

| 文件 | 模块 | 核心功能 | 难度 | 端口 |
|------|------|---------|------|------|
| `metrics-rate-limit-app.ts` | MetricsModule + RateLimitModule | Prometheus 指标、API 限流 | ⭐⭐⭐ | 3000 |

---

## 🔐 认证与安全

### SecurityModule (auth-app.ts)

**功能**：完整的认证授权解决方案

**特性**：
- ✅ JWT 访问令牌和刷新令牌
- ✅ OAuth2 授权码模式
- ✅ 基于角色的访问控制（RBAC）
- ✅ `@Auth()` 装饰器保护路由
- ✅ 包含完整的 Web UI 演示

**快速开始**：
```bash
bun run examples/02-official-modules/auth-app.ts
```

访问 http://localhost:3000 查看 Web UI 演示

**配置示例**：
```typescript
SecurityModule.forRoot({
  jwt: {
    secret: 'your-secret-key',
    accessTokenExpiresIn: 3600,     // 1 小时
    refreshTokenExpiresIn: 86400 * 7, // 7 天
  },
  oauth2Clients: [{
    clientId: 'my-client',
    clientSecret: 'my-secret',
    redirectUris: ['http://localhost:3000/callback'],
    grantTypes: ['authorization_code', 'refresh_token'],
  }],
  excludePaths: ['/api/users/login', '/api/users/public'],
  defaultAuthRequired: false,  // 通过 @Auth() 装饰器控制
})
```

**使用示例**：
```typescript
// 登录获取 Token
@POST('/login')
public async login(@Body() body: { username: string; password: string }) {
  const user = await this.userService.validateCredentials(...);
  const accessToken = this.jwtUtil.generateAccessToken({
    sub: user.id,
    username: user.username,
    roles: user.roles,
  });
  return { accessToken };
}

// 保护路由
@GET('/me')
@Auth()  // 需要认证
public getMe() {
  const securityContext = SecurityContextHolder.getContext();
  return securityContext.getPrincipal();
}

// 基于角色的访问控制
@GET('/')
@Auth({ roles: ['admin'] })  // 需要 admin 角色
public getAllUsers() {
  return { users: [...] };
}
```

---

### SessionModule (session-app.ts)

**功能**：Session 管理和 Cookie 处理

**特性**：
- ✅ Session 创建和销毁
- ✅ Session 数据存储
- ✅ 自动 Cookie 管理
- ✅ Rolling Session（访问时自动续期）

**快速开始**：
```bash
bun run examples/02-official-modules/session-app.ts
```

**配置示例**：
```typescript
SessionModule.forRoot({
  name: 'sessionId',    // Cookie 名称
  maxAge: 86400000,     // 24 小时
  rolling: true,        // 每次访问时更新过期时间
  cookie: {
    secure: false,      // 开发环境 false，生产环境 true
    httpOnly: true,     // 防止 JavaScript 访问
    path: '/',
    sameSite: 'lax',
  },
})
```

**使用示例**：
```typescript
// 登录创建 Session
@POST('/login')
public async login(@Body() body: { username: string; password: string }) {
  const user = await this.authService.login(body.username, body.password);
  // SessionService 会自动设置 Cookie
  return { message: 'Login successful', user };
}

// 使用 @Session() 注入当前 Session
@GET('/me')
public async getCurrentUser(@Session() session: SessionType | undefined) {
  if (!session) {
    return { error: 'Not authenticated' };
  }
  return {
    userId: session.data.userId,
    username: session.data.username,
  };
}

// 操作 Session 数据
@POST('/cart/add')
public async addToCart(
  @Session() session: SessionType,
  @Body() body: { item: string },
) {
  await this.sessionService.setValue(session.id, 'cart', [...cart, body.item]);
  return { message: 'Item added' };
}
```

---

## 📊 数据与缓存

### DatabaseModule (database-app.ts)

**功能**：数据库连接和查询

**特性**：
- ✅ 支持 SQLite、PostgreSQL、MySQL
- ✅ 连接池管理
- ✅ 参数化查询（防 SQL 注入）
- ✅ 健康检查集成

**快速开始**：
```bash
bun run examples/02-official-modules/database-app.ts
```

**配置示例**：
```typescript
DatabaseModule.forRoot({
  type: 'sqlite',
  databasePath: './data.db',
  defaultStrategy: 'pool',
})
```

**使用示例**：
```typescript
@Injectable()
class UserService {
  constructor(
    @Inject(DATABASE_SERVICE_TOKEN)
    private readonly database: DatabaseService
  ) {}

  async createUser(name: string, email: string) {
    // 参数化查询
    this.database.query(
      'INSERT INTO users (name, email) VALUES (?, ?)',
      [name, email]
    );
  }

  async getAllUsers() {
    return this.database.query<User>(
      'SELECT id, name, email FROM users'
    );
  }
}
```

### ServiceRegistryModule (nacos-auto-register-app.ts)

演示通过 `autoRegister: false` 关闭 `listen()` 阶段自动注册。

```typescript
ServiceRegistryModule.forRoot({
  provider: 'nacos',
  autoRegister: false,
  nacos: { client: { serverList: ['http://localhost:8848'] } },
});
```

---

### DatabaseModule ORM (orm-app.ts)

**功能**：Entity + Repository 模式

**特性**：
- ✅ `@Entity` 和 `@Column` 装饰器
- ✅ `BaseRepository` CRUD 操作
- ✅ 自定义 Repository 方法
- ✅ 类型安全的查询

**快速开始**：
```bash
bun run examples/02-official-modules/orm-app.ts
```

**使用示例**：
```typescript
// 1. 定义实体
@Entity('users')
class User {
  @PrimaryKey()
  @Column({ type: 'INTEGER', autoIncrement: true })
  public id!: number;

  @Column({ type: 'TEXT', nullable: false })
  public name!: string;

  @Column({ type: 'TEXT', nullable: false })
  public email!: string;
}

// 2. 定义 Repository
@Repository('users', 'id')
class UserRepository extends BaseRepository<User> {
  protected tableName = 'users';
  protected primaryKey = 'id';

  // 自定义查询方法
  async findByEmail(email: string): Promise<User | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE email = ?`;
    const result = await this.executeQuery<User>(sql, [email]);
    return result[0] ?? null;
  }
}

// 3. 在服务中使用
@Injectable()
class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  async createUser(name: string, email: string) {
    return await this.userRepository.create({ name, email });
  }

  async getAllUsers() {
    return await this.userRepository.findAll();
  }
}
```

---

### CacheModule (cache-app.ts)

**功能**：缓存管理

**特性**：
- ✅ `@Cacheable` 自动缓存方法结果
- ✅ `@CacheEvict` 清除缓存
- ✅ `@CachePut` 更新缓存
- ✅ 手动缓存操作（`CacheService`）
- ✅ TTL 支持

**快速开始**：
```bash
bun run examples/02-official-modules/cache-app.ts
```

**配置示例**：
```typescript
CacheModule.forRoot({
  defaultTtl: 60000,  // 默认 60 秒
  keyPrefix: 'app:',  // 键前缀
})
```

**注意**：`@Cacheable`、`@CacheEvict`、`@CachePut` 装饰器目前是未实现的功能（只有装饰器定义，没有拦截器实现），所以使用 `CacheService` 手动缓存。

**使用示例**：
```typescript
// 推荐：使用 CacheService 的 getOrSet
@Injectable()
class ProductService {
  constructor(
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cache: CacheService
  ) {}

  async getProduct(id: string) {
    // 使用 getOrSet 自动处理缓存
    return await this.cache.getOrSet(
      `product:${id}`,
      async () => {
        // 缓存不存在时执行
        return await this.fetchFromDatabase(id);
      },
      30000  // TTL: 30 秒
    );
  }
}
```

---

## ⚙️ 后台任务

### QueueModule (queue-app.ts)

**功能**：任务队列和定时任务

**特性**：
- ✅ 异步任务处理
- ✅ 任务优先级
- ✅ Cron 定时任务
- ✅ 任务处理器注册

**快速开始**：
```bash
bun run examples/02-official-modules/queue-app.ts
```

**配置示例**：
```typescript
QueueModule.forRoot({
  defaultQueue: 'default',
  enableWorker: true,   // 启用工作进程
  concurrency: 3,       // 并发处理 3 个任务
})
```

**使用示例**：
```typescript
@Injectable()
class NotificationService {
  constructor(
    @Inject(QUEUE_SERVICE_TOKEN)
    private readonly queue: QueueService
  ) {
    void this.registerHandlers();
  }

  async registerHandlers() {
    // 注册任务处理器
    await this.queue.registerHandler<{ to: string; subject: string }>(
      'send-email',
      async (job) => {
        await this.emailService.send(job.data.to, job.data.subject);
      }
    );
  }

  // 添加任务到队列
  async queueEmail(to: string, subject: string) {
    return await this.queue.add('send-email', { to, subject }, {
      priority: 10,  // 高优先级
    });
  }
}

// Cron 定时任务
@Injectable()
class ScheduledTaskService {
  constructor(@Inject(QUEUE_SERVICE_TOKEN) private readonly queue: QueueService) {
    void this.registerCronJobs();
  }

  async registerCronJobs() {
    // 每天午夜执行
    await this.queue.registerCron(
      'daily-report',
      async () => {
        console.log('Generating daily report...');
      },
      {
        pattern: '0 0 * * *',  // 分 时 日 月 周
        runOnInit: false,
      }
    );
  }
}
```

**Cron 表达式说明**：
```
┌───────────── 分钟 (0 - 59)
│ ┌───────────── 小时 (0 - 23)
│ │ ┌───────────── 日期 (1 - 31)
│ │ │ ┌───────────── 月份 (1 - 12)
│ │ │ │ ┌───────────── 星期 (0 - 7, 0 和 7 都是周日)
│ │ │ │ │
* * * * *

常用示例：
'0 0 * * *'     - 每天午夜
'0 * * * *'     - 每小时
'*/15 * * * *'  - 每 15 分钟
'0 9 * * 1-5'   - 工作日上午 9 点
```

---

### EventModule (events-app.ts)

**功能**：事件驱动架构，构建松耦合应用

**特性**：
- ✅ `@OnEvent()` 装饰器注册事件监听器
- ✅ 支持 Symbol 和字符串事件名
- ✅ 事件优先级
- ✅ 异步事件处理
- ✅ 通配符事件匹配（`user.*`、`order.**`）

**快速开始**：
```bash
bun run examples/02-official-modules/events-app.ts
```

**配置示例**：
```typescript
EventModule.forRoot({
  wildcard: true,       // 启用通配符匹配
  maxListeners: 20,     // 每个事件的最大监听器数量
  onError: (error, event, payload) => {
    console.error(`事件 ${String(event)} 发生错误:`, error);
  },
});

// 注册监听器类
EventModule.registerListeners([NotificationService, AnalyticsService]);

// 模块注册后初始化监听器
EventModule.initializeListeners(app.getContainer());
```

**使用示例**：
```typescript
// 定义事件
const USER_CREATED = Symbol('user.created');

interface UserCreatedEvent {
  userId: string;
  email: string;
}

// 发布事件
@Injectable()
class UserService {
  constructor(
    @Inject(EVENT_EMITTER_TOKEN) private eventEmitter: EventEmitter
  ) {}

  async createUser(email: string) {
    const userId = 'user-123';
    
    // 触发即忘
    this.eventEmitter.emit<UserCreatedEvent>(USER_CREATED, {
      userId,
      email,
    });
    
    // 或等待所有监听器完成
    await this.eventEmitter.emitAsync(USER_CREATED, { userId, email });
    
    return { userId, email };
  }
}

// 监听事件
@Injectable()
class NotificationService {
  @OnEvent(USER_CREATED)
  handleUserCreated(payload: UserCreatedEvent) {
    console.log(`欢迎邮件已发送至 ${payload.email}`);
  }

  @OnEvent(USER_CREATED, { async: true, priority: 10 })
  async trackUserCreation(payload: UserCreatedEvent) {
    await this.analytics.track('user_created', payload);
  }
}

// 通配符监听器
@Injectable()
class AuditService {
  @OnEvent('user.*')  // 匹配 user.created、user.updated、user.deleted
  auditUserEvents(payload: unknown) {
    console.log('用户事件:', payload);
  }

  @OnEvent('order.**')  // 匹配 order.created、order.item.added 等
  auditOrderEvents(payload: unknown) {
    console.log('订单事件:', payload);
  }
}
```

---

## 🔧 常见问题

### Q1: SecurityModule 的 `excludePaths` 为什么不能用 '/'？

**A**: `excludePaths` 使用前缀匹配，'/' 会匹配所有路径，导致认证中间件完全失效。应该明确列出需要排除的路径：
```typescript
excludePaths: ['/api/users/login', '/api/users/public', '/callback']
```

### Q2: Session 中间件注册顺序重要吗？

**A**: 非常重要！必须先注册模块，再注册中间件：
```typescript
// ✅ 正确
app.registerModule(SessionModule);
const container = app.getContainer();
app.use(createSessionMiddleware(container));

// ❌ 错误：容器中还没有 SessionService
app.use(createSessionMiddleware(container));
app.registerModule(SessionModule);
```

### Q3: 缓存装饰器的 `key` 参数如何使用动态值？

**A**: 使用 `{参数名}` 占位符：
```typescript
@Cacheable({ key: 'user:{id}', ttl: 60000 })
async findUser(id: string) {
  // key 会自动替换为 'user:123'
}

@Cacheable({ key: 'product:{category}:{id}' })
async findProduct(category: string, id: string) {
  // key: 'product:electronics:456'
}
```

### Q4: 队列任务处理失败怎么办？

**A**: 可以配置重试策略（功能待实现），当前建议在处理器中添加错误处理：
```typescript
await this.queue.registerHandler('risky-task', async (job) => {
  try {
    await this.doRiskyOperation(job.data);
  } catch (error) {
    console.error('Task failed:', error);
    // 可以选择重新入队或记录到死信队列
  }
});
```

## 📖 相关文档

- 📚 [API 文档](../../docs/api.md)
- 🎓 [使用指南](../../docs/guide.md)
- 🏆 [最佳实践](../../docs/best-practices.md)
- 🐛 [故障排查](../../docs/troubleshooting.md)

## ⬅️ 返回

[← 返回示例索引](../README.md)
