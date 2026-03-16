# Official Modules Examples

[中文](./README_ZH.md) | **English**

This directory contains examples for Bun Server Framework's official modules - ready-to-use functionality out of the box.

## 📚 Module Categories

### 🔐 Authentication & Security

| File | Module | Key Features | Port |
|------|--------|--------------|------|
| `auth-app.ts` | SecurityModule | JWT + OAuth2, RBAC | 3000 |
| `session-app.ts` | SessionModule | Session management | 3400 |

### 📊 Data & Caching

| File | Module | Key Features | Port |
|------|--------|--------------|------|
| `database-app.ts` | DatabaseModule | SQLite, queries, health checks | 3000 |
| `nacos-auto-register-app.ts` | ServiceRegistryModule | Nacos autoRegister switch | 3010 |
| `orm-app.ts` | DatabaseModule (ORM) | Entity + Repository pattern | 3000 |
| `cache-app.ts` | CacheModule | Cache decorators | 3200 |
| `transaction-app.ts` | DatabaseModule (TX) | `@Transactional` decorator | 3000 |

### ⚙️ Background Tasks

| File | Module | Key Features | Port |
|------|--------|--------------|------|
| `queue-app.ts` | QueueModule | Task queues, Cron jobs | 3300 |
| `events-app.ts` | EventModule | Event-driven architecture | 3400 |

### 📈 Monitoring & Rate Limiting

| File | Module | Key Features | Port |
|------|--------|--------------|------|
| `metrics-rate-limit-app.ts` | MetricsModule + RateLimitModule | Prometheus, API throttling | 3000 |

---

## 🔐 Authentication & Security

### SecurityModule (auth-app.ts)

**Features**: Complete authentication and authorization solution

**Highlights**:
- ✅ JWT access and refresh tokens
- ✅ OAuth2 authorization code flow
- ✅ Role-based access control (RBAC)
- ✅ `@Auth()` decorator for route protection
- ✅ Includes complete Web UI demo

**Quick Start**:
```bash
bun run examples/02-official-modules/auth-app.ts
```

Visit http://localhost:3000 for Web UI demo

**Configuration**:
```typescript
SecurityModule.forRoot({
  jwt: {
    secret: 'your-secret-key',
    accessTokenExpiresIn: 3600,     // 1 hour
    refreshTokenExpiresIn: 86400 * 7, // 7 days
  },
  oauth2Clients: [{
    clientId: 'my-client',
    clientSecret: 'my-secret',
    redirectUris: ['http://localhost:3000/callback'],
    grantTypes: ['authorization_code', 'refresh_token'],
  }],
  excludePaths: ['/api/users/login', '/api/users/public'],
  defaultAuthRequired: false,  // Control via @Auth() decorator
})
```

**Usage**:
```typescript
// Login to get token
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

// Protected route
@GET('/me')
@Auth()  // Requires authentication
public getMe() {
  const securityContext = SecurityContextHolder.getContext();
  return securityContext.getPrincipal();
}

// Role-based access control
@GET('/')
@Auth({ roles: ['admin'] })  // Requires admin role
public getAllUsers() {
  return { users: [...] };
}
```

---

### SessionModule (session-app.ts)

**Features**: Session management and Cookie handling

**Highlights**:
- ✅ Session creation and destruction
- ✅ Session data storage
- ✅ Automatic Cookie management
- ✅ Rolling sessions (auto-renewal on access)

**Quick Start**:
```bash
bun run examples/02-official-modules/session-app.ts
```

**Configuration**:
```typescript
SessionModule.forRoot({
  name: 'sessionId',    // Cookie name
  maxAge: 86400000,     // 24 hours
  rolling: true,        // Renew on each access
  cookie: {
    secure: false,      // false for dev, true for production
    httpOnly: true,     // Prevent JavaScript access
    path: '/',
    sameSite: 'lax',
  },
})
```

**Usage**:
```typescript
// Login creates session
@POST('/login')
public async login(@Body() body: { username: string; password: string }) {
  const user = await this.authService.login(body.username, body.password);
  // SessionService automatically sets cookie
  return { message: 'Login successful', user };
}

// Inject current session with @Session()
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

// Manipulate session data
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

## 📊 Data & Caching

### DatabaseModule (database-app.ts)

**Features**: Database connection and queries

**Highlights**:
- ✅ Supports SQLite, PostgreSQL, MySQL
- ✅ Connection pool management
- ✅ Parameterized queries (SQL injection prevention)
- ✅ Health check integration

**Configuration**:
```typescript
DatabaseModule.forRoot({
  type: 'sqlite',
  databasePath: './data.db',
  defaultStrategy: 'pool',
})
```

**Usage**:
```typescript
@Injectable()
class UserService {
  constructor(
    @Inject(DATABASE_SERVICE_TOKEN)
    private readonly database: DatabaseService
  ) {}

  async createUser(name: string, email: string) {
    // Parameterized query
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

Demonstrates `autoRegister: false` to disable listen-time automatic registration.

```typescript
ServiceRegistryModule.forRoot({
  provider: 'nacos',
  autoRegister: false,
  nacos: { client: { serverList: ['http://localhost:8848'] } },
});
```

---

### CacheModule (cache-app.ts)

**Features**: Cache management

**Highlights**:
- ✅ `@Cacheable` auto-caches method results
- ✅ `@CacheEvict` clears cache
- ✅ `@CachePut` updates cache
- ✅ Manual cache operations (`CacheService`)
- ✅ TTL support

**Configuration**:
```typescript
CacheModule.forRoot({
  defaultTtl: 60000,  // Default 60 seconds
  keyPrefix: 'app:',  // Key prefix
})
```

**Note**: `@Cacheable`, `@CacheEvict`, `@CachePut` decorators are currently unimplemented (decorators exist but no interceptor). Use `CacheService` for manual caching.

**Usage**:
```typescript
// Recommended: CacheService with getOrSet
@Injectable()
class ProductService {
  constructor(
    @Inject(CACHE_SERVICE_TOKEN)
    private readonly cache: CacheService
  ) {}

  async getProduct(id: string) {
    // Auto-handle caching with getOrSet
    return await this.cache.getOrSet(
      `product:${id}`,
      async () => {
        // Execute if cache doesn't exist
        return await this.fetchFromDatabase(id);
      },
      30000  // TTL: 30 seconds
    );
  }
}
```

---

## ⚙️ Background Tasks

### QueueModule (queue-app.ts)

**Features**: Task queues and scheduled jobs

**Highlights**:
- ✅ Async task processing
- ✅ Task priorities
- ✅ Cron scheduled jobs
- ✅ Job handler registration

**Configuration**:
```typescript
QueueModule.forRoot({
  defaultQueue: 'default',
  enableWorker: true,   // Enable worker process
  concurrency: 3,       // Process 3 tasks concurrently
})
```

**Usage**:
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
    // Register job handler
    await this.queue.registerHandler<{ to: string; subject: string }>(
      'send-email',
      async (job) => {
        await this.emailService.send(job.data.to, job.data.subject);
      }
    );
  }

  // Add job to queue
  async queueEmail(to: string, subject: string) {
    return await this.queue.add('send-email', { to, subject }, {
      priority: 10,  // High priority
    });
  }
}

// Cron scheduled jobs
@Injectable()
class ScheduledTaskService {
  constructor(@Inject(QUEUE_SERVICE_TOKEN) private readonly queue: QueueService) {
    void this.registerCronJobs();
  }

  async registerCronJobs() {
    // Run daily at midnight
    await this.queue.registerCron(
      'daily-report',
      async () => {
        console.log('Generating daily report...');
      },
      {
        pattern: '0 0 * * *',  // min hour day month weekday
        runOnInit: false,
      }
    );
  }
}
```

**Cron expression guide**:
```
┌───────────── minute (0 - 59)
│ ┌───────────── hour (0 - 23)
│ │ ┌───────────── day of month (1 - 31)
│ │ │ ┌───────────── month (1 - 12)
│ │ │ │ ┌───────────── day of week (0 - 7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *

Common examples:
'0 0 * * *'     - Daily at midnight
'0 * * * *'     - Every hour
'*/15 * * * *'  - Every 15 minutes
'0 9 * * 1-5'   - Weekdays at 9 AM
```

---

### EventModule (events-app.ts)

**Features**: Event-driven architecture for loosely coupled applications

**Highlights**:
- ✅ `@OnEvent()` decorator for event listeners
- ✅ Symbol and string event names
- ✅ Event priorities
- ✅ Async event handling
- ✅ Wildcard event matching (`user.*`, `order.**`)

**Quick Start**:
```bash
bun run examples/02-official-modules/events-app.ts
```

**Configuration**:
```typescript
EventModule.forRoot({
  wildcard: true,       // Enable wildcard matching
  maxListeners: 20,     // Max listeners per event
  onError: (error, event, payload) => {
    console.error(`Error in event ${String(event)}:`, error);
  },
});

// Register listener classes
EventModule.registerListeners([NotificationService, AnalyticsService]);

// Initialize after module registration
EventModule.initializeListeners(app.getContainer());
```

**Usage**:
```typescript
// Define event
const USER_CREATED = Symbol('user.created');

interface UserCreatedEvent {
  userId: string;
  email: string;
}

// Publish events
@Injectable()
class UserService {
  constructor(
    @Inject(EVENT_EMITTER_TOKEN) private eventEmitter: EventEmitter
  ) {}

  async createUser(email: string) {
    const userId = 'user-123';
    
    // Fire and forget
    this.eventEmitter.emit<UserCreatedEvent>(USER_CREATED, {
      userId,
      email,
    });
    
    // Or wait for all listeners
    await this.eventEmitter.emitAsync(USER_CREATED, { userId, email });
    
    return { userId, email };
  }
}

// Listen to events
@Injectable()
class NotificationService {
  @OnEvent(USER_CREATED)
  handleUserCreated(payload: UserCreatedEvent) {
    console.log(`Welcome email sent to ${payload.email}`);
  }

  @OnEvent(USER_CREATED, { async: true, priority: 10 })
  async trackUserCreation(payload: UserCreatedEvent) {
    await this.analytics.track('user_created', payload);
  }
}

// Wildcard listeners
@Injectable()
class AuditService {
  @OnEvent('user.*')  // Matches user.created, user.updated, user.deleted
  auditUserEvents(payload: unknown) {
    console.log('User event:', payload);
  }

  @OnEvent('order.**')  // Matches order.created, order.item.added, etc.
  auditOrderEvents(payload: unknown) {
    console.log('Order event:', payload);
  }
}
```

---

## 🔧 Common Questions

### Q1: Why can't SecurityModule's `excludePaths` use '/'?

**A**: `excludePaths` uses prefix matching. '/' matches all paths, disabling auth middleware completely. List paths explicitly:
```typescript
excludePaths: ['/api/users/login', '/api/users/public', '/callback']
```

### Q2: Does Session middleware registration order matter?

**A**: Yes! Must register module before middleware:
```typescript
// ✅ Correct
app.registerModule(SessionModule);
const container = app.getContainer();
app.use(createSessionMiddleware(container));

// ❌ Wrong: SessionService not in container yet
app.use(createSessionMiddleware(container));
app.registerModule(SessionModule);
```

### Q3: How to use dynamic values in cache decorator `key`?

**A**: Use `{paramName}` placeholders:
```typescript
@Cacheable({ key: 'user:{id}', ttl: 60000 })
async findUser(id: string) {
  // key auto-replaced to 'user:123'
}

@Cacheable({ key: 'product:{category}:{id}' })
async findProduct(category: string, id: string) {
  // key: 'product:electronics:456'
}
```

## 📖 Related Documentation

- 📚 [API Documentation](../../docs/api.md)
- 🎓 [User Guide](../../docs/guide.md)
- 🏆 [Best Practices](../../docs/best-practices.md)
- 🐛 [Troubleshooting](../../docs/troubleshooting.md)

## ⬅️ Back

[← Back to Examples Index](../README.md)
