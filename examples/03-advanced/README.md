# 高级功能示例

本目录包含 Bun Server Framework 高级功能的示例，展示如何扩展和自定义框架行为。

## 📚 示例列表

| 文件 | 说明 | 核心技术 | 难度 | 端口 |
|------|------|---------|------|------|
| `custom-decorator-app.ts` | 自定义装饰器：创建 @Timing 装饰器 | Metadata API、Interceptor | ⭐⭐⭐ | 3000 |
| `advanced-decorator-app.ts` | 高级装饰器：多装饰器组合 | 装饰器链、优先级 | ⭐⭐⭐⭐ | 3000 |
| `microservice-app.ts` | 微服务架构：服务间通信 | Nacos、配置中心 | ⭐⭐⭐⭐⭐ | 多端口 |

## 🎯 学习路径

### 1. 自定义装饰器基础 (custom-decorator-app.ts)

学习如何创建自己的装饰器来扩展框架功能。

**示例：创建 @Timing 装饰器**

```typescript
// Step 1: 定义 Metadata Key
const TIMING_METADATA_KEY = Symbol('@example:timing');

// Step 2: 创建装饰器
export function Timing(options: TimingOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(TIMING_METADATA_KEY, options, target, propertyKey);
  };
}

// Step 3: 实现拦截器
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

// Step 4: 注册拦截器
const registry = app
  .getContainer()
  .resolve<InterceptorRegistry>(INTERCEPTOR_REGISTRY_TOKEN);

registry.register(TIMING_METADATA_KEY, new TimingInterceptor(), 100);

// Step 5: 使用装饰器
@Controller('/api/users')
class UserController {
  @GET('/')
  @Timing({ label: 'List Users' })
  public listUsers() {
    return [{ id: 1, name: 'Alice' }];
  }
}
```

**运行**：
```bash
bun run examples/03-advanced/custom-decorator-app.ts
```

**测试**：
```bash
curl http://localhost:3000/api/users
# 控制台会显示执行时间
```

**适用场景**：
- ✅ 性能监控（方法执行时间）
- ✅ 日志记录（方法调用追踪）
- ✅ 权限校验（自定义权限逻辑）
- ✅ 数据验证（扩展验证规则）
- ✅ 缓存管理（自定义缓存策略）

---

### 2. 高级装饰器技巧 (advanced-decorator-app.ts)

学习装饰器组合、优先级控制和复杂场景处理。

**关键概念**：

1. **装饰器执行顺序**
```typescript
@Decorator1()  // 最后执行
@Decorator2()  // 第二执行
@Decorator3()  // 最先执行
public method() {}

// 执行顺序：Decorator3 → Decorator2 → Decorator1
```

2. **拦截器优先级**
```typescript
// 数字越小，优先级越高
registry.register(KEY1, interceptor1, 10);   // 最先执行
registry.register(KEY2, interceptor2, 50);
registry.register(KEY3, interceptor3, 100);  // 最后执行
```

3. **装饰器组合**
```typescript
@GET('/users')
@Auth({ roles: ['admin'] })      // 权限检查
@RateLimit({ max: 100 })         // 限流
@Cache({ ttl: 60000 })           // 缓存
@Timing({ label: 'Get Users' })  // 性能监控
public getUsers() {}
```

---

### 3. 微服务架构 (microservice-app.ts)

学习如何使用 Bun Server 构建微服务系统。

**核心功能**：
- ✅ 服务注册与发现（Nacos）
- ✅ 配置中心（动态配置）
- ✅ 负载均衡
- ✅ 服务间通信

**架构示例**：
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
                   │  (配置中心 +   │
                   │   服务发现)    │
                   └────────────────┘
```

**快速开始**：
```bash
# 1. 启动 Nacos（需要单独安装）
# 2. 运行微服务示例
bun run examples/03-advanced/microservice-app.ts
```

---

## 💡 核心概念详解

### Metadata API

Bun Server 使用 `reflect-metadata` 存储装饰器元数据：

```typescript
// 设置元数据
Reflect.defineMetadata(key, value, target, propertyKey);

// 获取元数据
const value = Reflect.getMetadata(key, target, propertyKey);

// 检查是否存在
const has = Reflect.hasMetadata(key, target, propertyKey);

// 删除元数据
Reflect.deleteMetadata(key, target, propertyKey);
```

**注意事项**：
- 元数据存储在原型链上，实例和原型需要分别处理
- Symbol key 避免命名冲突
- 必须 `import 'reflect-metadata'`

### Interceptor（拦截器）

拦截器是装饰器的执行引擎：

```typescript
interface Interceptor {
  execute<T>(
    target: unknown,              // 目标对象（实例或原型）
    propertyKey: string | symbol, // 方法名
    originalMethod: Function,     // 原始方法
    args: unknown[],              // 方法参数
    container: Container,         // DI 容器
    context?: Context,            // HTTP 上下文（如果有）
  ): Promise<T>;
}
```

**拦截器注册表**：
```typescript
interface InterceptorRegistry {
  register(
    metadataKey: symbol,          // 装饰器的 Metadata Key
    interceptor: Interceptor,     // 拦截器实例
    priority: number,             // 优先级（越小越先执行）
  ): void;
}
```

### 装饰器最佳实践

1. **命名规范**
   - HTTP 方法装饰器：大写（`@GET`, `@POST`）
   - 其他装饰器：PascalCase（`@Injectable`, `@Cacheable`）
   - Metadata Key：使用 Symbol 并添加前缀（`Symbol('@myapp:timing')`）

2. **参数设计**
   ```typescript
   // ✅ 使用 options 对象
   @Timing({ label: 'Get Users', threshold: 1000 })
   
   // ❌ 避免过多位置参数
   @Timing('Get Users', 1000, true)
   ```

3. **错误处理**
   ```typescript
   class SafeInterceptor implements Interceptor {
     async execute(...) {
       try {
         return await originalMethod.apply(target, args);
       } catch (error) {
         console.error('Interceptor error:', error);
         throw error;  // 重新抛出，让上层处理
       }
     }
   }
   ```

4. **性能考虑**
   ```typescript
   // ✅ 缓存元数据查找
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

## 🎨 实战示例

### 示例 1: 审计日志装饰器

记录方法调用的审计日志：

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

// 使用
@DELETE('/:id')
@Audit({ action: 'delete', resource: 'user' })
public deleteUser(@Param('id') id: string) {}
```

### 示例 2: 重试装饰器

自动重试失败的操作：

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

// 使用
@GET('/external-api')
@Retry({ maxAttempts: 3, delay: 1000 })
public async fetchExternalData() {}
```

---

## 🔧 常见问题

### Q1: 如何确保装饰器的执行顺序？

**A**: 使用拦截器优先级：
```typescript
registry.register(AUTH_KEY, authInterceptor, 10);      // 优先级 10
registry.register(CACHE_KEY, cacheInterceptor, 50);    // 优先级 50
registry.register(TIMING_KEY, timingInterceptor, 100); // 优先级 100

// 执行顺序：auth → cache → timing → 原方法 → timing → cache → auth
```

### Q2: 装饰器可以访问请求上下文吗？

**A**: 可以，通过 `context` 参数：
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

### Q3: 如何在装饰器中使用依赖注入？

**A**: 通过 `container` 参数解析服务：
```typescript
class MyInterceptor implements Interceptor {
  async execute(target, propertyKey, originalMethod, args, container, context) {
    const logger = container.resolve<Logger>(LOGGER_TOKEN);
    logger.info('Method called');
    // ...
  }
}
```

### Q4: 装饰器可以修改返回值吗？

**A**: 可以：
```typescript
class TransformInterceptor implements Interceptor {
  async execute(...) {
    const result = await originalMethod.apply(target, args);
    
    // 包装返回值
    return {
      success: true,
      data: result,
      timestamp: Date.now(),
    };
  }
}
```

---

## 📖 相关文档

- 📚 [自定义装饰器文档](../../docs/custom-decorators.md)
- 🎓 [使用指南](../../docs/guide.md)
- 🏆 [最佳实践](../../docs/best-practices.md)
- 🔬 [TypeScript Decorators](https://www.typescriptlang.org/docs/handbook/decorators.html)
- 🔍 [Reflect Metadata](https://github.com/rbuckton/reflect-metadata)

## ⬅️ 返回

[← 返回示例索引](../README.md)
