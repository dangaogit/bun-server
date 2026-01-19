# Advanced Features Examples

[中文](./README_ZH.md) | **English**

This directory contains advanced examples showing how to extend and customize Bun Server Framework.

## 📚 Examples

| File | Description | Tech Stack | Difficulty | Port |
|------|-------------|------------|------------|------|
| `custom-decorator-app.ts` | Custom decorators: Create @Timing decorator | Metadata API, Interceptor | ⭐⭐⭐ | 3000 |
| `advanced-decorator-app.ts` | Advanced decorators: Multiple decorator composition | Decorator chains, priorities | ⭐⭐⭐⭐ | 3000 |
| `websocket-chat-app.ts` | Complete WebSocket chat with rooms (Web UI) | Rooms, broadcast, user list | ⭐⭐⭐ | 3600 |
| `microservice-app.ts` | Microservices architecture | Nacos, config center | ⭐⭐⭐⭐⭐ | Multiple |

## 🎯 Learning Path

### 1. Custom Decorators Basics (custom-decorator-app.ts)

Learn how to create your own decorators to extend framework functionality.

**Example: Create @Timing decorator**

```typescript
// Step 1: Define Metadata Key
const TIMING_METADATA_KEY = Symbol('@example:timing');

// Step 2: Create decorator
export function Timing(options: TimingOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(TIMING_METADATA_KEY, options, target, propertyKey);
  };
}

// Step 3: Implement interceptor
class TimingInterceptor implements Interceptor {
  async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    const start = performance.now();
    console.log(`[Timing] Start`);
    
    const result = await Promise.resolve(originalMethod.apply(target, args));
    
    const duration = performance.now() - start;
    console.log(`[Timing] Completed in ${duration.toFixed(2)}ms`);
    
    return result;
  }
}

// Step 4: Register interceptor
const registry = app
  .getContainer()
  .resolve<InterceptorRegistry>(INTERCEPTOR_REGISTRY_TOKEN);

registry.register(TIMING_METADATA_KEY, new TimingInterceptor(), 100);

// Step 5: Use decorator
@Controller('/api/users')
class UserController {
  @GET('/')
  @Timing({ label: 'List Users' })
  public listUsers() {
    return [{ id: 1, name: 'Alice' }];
  }
}
```

**Run**:
```bash
bun run examples/03-advanced/custom-decorator-app.ts
```

**Test**:
```bash
curl http://localhost:3000/api/users
# Console shows execution time
```

**Use cases**:
- ✅ Performance monitoring (method execution time)
- ✅ Logging (method call tracing)
- ✅ Permission validation (custom auth logic)
- ✅ Data validation (extended validation rules)
- ✅ Cache management (custom caching strategies)

---

### 2. Advanced Decorator Techniques (advanced-decorator-app.ts)

Learn decorator composition, priority control, and complex scenarios.

**Key Concepts**:

1. **Decorator execution order**
```typescript
@Decorator1()  // Executes last
@Decorator2()  // Executes second
@Decorator3()  // Executes first
public method() {}

// Execution order: Decorator3 → Decorator2 → Decorator1
```

2. **Interceptor priorities**
```typescript
// Lower number = higher priority
registry.register(KEY1, interceptor1, 10);   // Executes first
registry.register(KEY2, interceptor2, 50);
registry.register(KEY3, interceptor3, 100);  // Executes last
```

3. **Decorator composition**
```typescript
@GET('/users')
@Auth({ roles: ['admin'] })      // Auth check
@RateLimit({ max: 100 })         // Rate limiting
@Cache({ ttl: 60000 })           // Caching
@Timing({ label: 'Get Users' })  // Performance monitoring
public getUsers() {}
```

---

### 3. WebSocket Chat Application (websocket-chat-app.ts)

Complete WebSocket chat room with Web UI.

**Features**:
- ✅ Room management (join/leave)
- ✅ Broadcast messages
- ✅ Online user list
- ✅ Connection lifecycle management

**Run**:
```bash
bun run examples/03-advanced/websocket-chat-app.ts
```

Visit http://localhost:3600 to open Web UI

**Architecture**:
```typescript
@WebSocketGateway('/ws/chat')
class ChatGateway {
  constructor(private readonly chatService: ChatService) {}

  @OnOpen
  handleOpen(ws: ServerWebSocket<WebSocketConnectionData>) {
    // User online
    this.chatService.userOnline(userId, username, ws);
  }

  @OnMessage
  handleMessage(ws: ServerWebSocket<WebSocketConnectionData>, message: string) {
    const data = JSON.parse(message);
    
    switch (data.action) {
      case 'join_room':
        this.chatService.joinRoom(userId, data.room);
        break;
      case 'send_message':
        this.chatService.broadcastToRoom(data.room, data.content);
        break;
    }
  }

  @OnClose
  handleClose(ws: ServerWebSocket<WebSocketConnectionData>) {
    // User offline
    this.chatService.userOffline(userId);
  }
}
```

---

### 4. Microservices Architecture (microservice-app.ts)

Learn how to build microservice systems with Bun Server.

**Core Features**:
- ✅ Service registration & discovery (Nacos)
- ✅ Configuration center (dynamic config)
- ✅ Load balancing
- ✅ Inter-service communication

**Architecture**:
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Gateway   │────>│   User      │────>│  Database   │
│   Service   │     │   Service   │     │   Service   │
│  (Port 8000)│     │  (Port 8001)│     │  (Port 8002)│
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │                   │
       └───────────────────┴───────────────────┘
                           │
                   ┌───────┴────────┐
                   │  Nacos Server  │
                   │  (Config +     │
                   │   Discovery)   │
                   └────────────────┘
```

---

## 💡 Core Concepts

### Metadata API

Bun Server uses `reflect-metadata` to store decorator metadata:

```typescript
// Set metadata
Reflect.defineMetadata(key, value, target, propertyKey);

// Get metadata
const value = Reflect.getMetadata(key, target, propertyKey);

// Check existence
const has = Reflect.hasMetadata(key, target, propertyKey);

// Delete metadata
Reflect.deleteMetadata(key, target, propertyKey);
```

**Notes**:
- Metadata stored on prototype chain, instances and prototypes need separate handling
- Use Symbol keys to avoid naming conflicts
- Must `import 'reflect-metadata'`

### Interceptor

Interceptors are the execution engine for decorators:

```typescript
interface Interceptor {
  execute<T>(
    target: unknown,              // Target object (instance or prototype)
    propertyKey: string | symbol, // Method name
    originalMethod: Function,     // Original method
    args: unknown[],              // Method arguments
    container: Container,         // DI container
    context?: Context,            // HTTP context (if available)
  ): Promise<T>;
}
```

**Interceptor Registry**:
```typescript
interface InterceptorRegistry {
  register(
    metadataKey: symbol,          // Decorator's Metadata Key
    interceptor: Interceptor,     // Interceptor instance
    priority: number,             // Priority (lower = earlier)
  ): void;
}
```

### Decorator Best Practices

1. **Naming conventions**
   - HTTP method decorators: Uppercase (`@GET`, `@POST`)
   - Other decorators: PascalCase (`@Injectable`, `@Cacheable`)
   - Metadata Keys: Use Symbol with prefix (`Symbol('@myapp:timing')`)

2. **Parameter design**
   ```typescript
   // ✅ Use options object
   @Timing({ label: 'Get Users', threshold: 1000 })
   
   // ❌ Avoid too many positional parameters
   @Timing('Get Users', 1000, true)
   ```

3. **Error handling**
   ```typescript
   class SafeInterceptor implements Interceptor {
     async execute(...) {
       try {
         return await originalMethod.apply(target, args);
       } catch (error) {
         console.error('Interceptor error:', error);
         throw error;  // Rethrow for upper layer handling
       }
     }
   }
   ```

4. **Performance considerations**
   ```typescript
   // ✅ Cache metadata lookups
   private metadataCache = new WeakMap();
   
   async execute(...) {
     let metadata = this.metadataCache.get(target);
     if (!metadata) {
       metadata = Reflect.getMetadata(KEY, target, propertyKey);
       this.metadataCache.set(target, metadata);
     }
   }
   ```

---

## 🎨 Practical Examples

### Example 1: Audit Log Decorator

Record audit logs for method calls:

```typescript
const AUDIT_KEY = Symbol('@audit');

interface AuditOptions {
  action: string;
  resource: string;
}

export function Audit(options: AuditOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(AUDIT_KEY, options, target, propertyKey);
  };
}

class AuditInterceptor implements Interceptor {
  async execute(...) {
    const metadata = Reflect.getMetadata(AUDIT_KEY, target, propertyKey);
    const userId = context?.getHeader('x-user-id');
    
    console.log(`[Audit] User ${userId} ${metadata.action} ${metadata.resource}`);
    
    try {
      const result = await originalMethod.apply(target, args);
      console.log(`[Audit] Success`);
      return result;
    } catch (error) {
      console.log(`[Audit] Failed:`, error.message);
      throw error;
    }
  }
}

// Usage
@DELETE('/:id')
@Audit({ action: 'delete', resource: 'user' })
public deleteUser(@Param('id') id: string) {}
```

### Example 2: Retry Decorator

Auto-retry failed operations:

```typescript
const RETRY_KEY = Symbol('@retry');

interface RetryOptions {
  maxAttempts: number;
  delay: number;
}

export function Retry(options: RetryOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(RETRY_KEY, options, target, propertyKey);
  };
}

class RetryInterceptor implements Interceptor {
  async execute(...) {
    const { maxAttempts, delay } = Reflect.getMetadata(RETRY_KEY, target, propertyKey);
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await originalMethod.apply(target, args);
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        console.log(`[Retry] Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
}

// Usage
@GET('/external-api')
@Retry({ maxAttempts: 3, delay: 1000 })
public async fetchExternalData() {}
```

---

## 🔧 Common Questions

### Q1: How to ensure decorator execution order?

**A**: Use interceptor priorities:
```typescript
registry.register(AUTH_KEY, authInterceptor, 10);      // Priority 10
registry.register(CACHE_KEY, cacheInterceptor, 50);    // Priority 50
registry.register(TIMING_KEY, timingInterceptor, 100); // Priority 100

// Execution: auth → cache → timing → method → timing → cache → auth
```

### Q2: Can decorators access request context?

**A**: Yes, via `context` parameter:
```typescript
class MyInterceptor implements Interceptor {
  async execute(target, propertyKey, originalMethod, args, container, context) {
    if (context) {
      const userId = context.getHeader('x-user-id');
      const path = context.path;
      // ...
    }
  }
}
```

### Q3: How to use DI in decorators?

**A**: Via `container` parameter:
```typescript
class MyInterceptor implements Interceptor {
  async execute(target, propertyKey, originalMethod, args, container, context) {
    const logger = container.resolve<Logger>(LOGGER_TOKEN);
    logger.info('Method called');
    // ...
  }
}
```

### Q4: Can decorators modify return values?

**A**: Yes:
```typescript
class TransformInterceptor implements Interceptor {
  async execute(...) {
    const result = await originalMethod.apply(target, args);
    
    // Wrap return value
    return {
      success: true,
      data: result,
      timestamp: Date.now(),
    };
  }
}
```

---

## 📖 Related Documentation

- 📚 [Custom Decorators Guide](../../docs/custom-decorators.md)
- 🎓 [User Guide](../../docs/guide.md)
- 🏆 [Best Practices](../../docs/best-practices.md)
- 🔬 [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- 🔍 [Reflect Metadata](https://github.com/rbuckton/reflect-metadata)

## ⬅️ Back

[← Back to Examples Index](../README.md)
