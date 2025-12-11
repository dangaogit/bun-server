# Performance Optimization Guide

This guide covers performance optimization techniques for Bun Server Framework
applications.

## Table of Contents

- [Benchmarking](#benchmarking)
- [Caching Strategies](#caching-strategies)
- [Database Optimization](#database-optimization)
- [Middleware Optimization](#middleware-optimization)
- [Response Optimization](#response-optimization)
- [Memory Management](#memory-management)
- [Concurrency](#concurrency)

## Benchmarking

### Using Performance Harness

Use the built-in `PerformanceHarness` for benchmarking:

```typescript
import { PerformanceHarness } from "@dangao/bun-server/testing";

const result = await PerformanceHarness.benchmark(
  "my-operation",
  1000,
  async () => {
    // Your code to benchmark
    await doSomething();
  },
);

console.log(`Operations per second: ${result.opsPerSecond}`);
console.log(`Total duration: ${result.durationMs}ms`);
```

### Stress Testing

Use `StressTester` for concurrent load testing:

```typescript
import { StressTester } from "@dangao/bun-server/testing";

const result = await StressTester.run(
  "my-endpoint",
  1000, // iterations
  10, // concurrency
  async (iteration) => {
    const response = await fetch("http://localhost:3000/api/test");
    await response.text();
  },
);

console.log(`Errors: ${result.errors}`);
console.log(`Duration: ${result.durationMs}ms`);
```

## Caching Strategies

### Use CacheModule

Enable caching for frequently accessed data:

```typescript
import {
  CACHE_SERVICE_TOKEN,
  CacheModule,
  CacheService,
} from "@dangao/bun-server";

CacheModule.forRoot({
  store: new RedisCacheStore(redisClient), // Use Redis for distributed caching
  defaultTtl: 3600000, // 1 hour
});

@Injectable()
class ProductService {
  public constructor(
    @Inject(CACHE_SERVICE_TOKEN) private readonly cache: CacheService,
  ) {}

  public async getProduct(id: string) {
    return await this.cache.getOrSet(
      `product:${id}`,
      async () => {
        return await this.db.findProduct(id);
      },
      3600000, // Cache for 1 hour
    );
  }
}
```

### Cache Decorators

Use cache decorators for automatic caching:

```typescript
import { Cacheable, CacheEvict, CachePut } from "@dangao/bun-server";

@Controller("/api/products")
class ProductController {
  @GET("/:id")
  @Cacheable({ key: "product", ttl: 3600000 })
  public async getProduct(@Param("id") id: string) {
    return await this.productService.find(id);
  }

  @PUT("/:id")
  @CachePut({ key: "product" })
  @CacheEvict({ key: "products:list" })
  public async updateProduct(@Param("id") id: string, @Body() data: any) {
    return await this.productService.update(id, data);
  }
}
```

### Cache Invalidation

Implement cache invalidation strategies:

```typescript
// Invalidate on update
@PUT('/:id')
@CacheEvict({ key: 'product', pattern: true })
public async updateProduct(@Param('id') id: string) {
  // Cache for 'product:*' will be invalidated
}

// Invalidate multiple keys
@DELETE('/:id')
@CacheEvict({ keys: ['product', 'products:list'] })
public async deleteProduct(@Param('id') id: string) {
  // Both caches invalidated
}
```

## Database Optimization

### Connection Pooling

Configure appropriate connection pool size:

```typescript
DatabaseModule.forRoot({
  database: {
    type: "postgres",
    config: {
      connectionString: process.env.DATABASE_URL,
      max: 20, // Maximum connections
      min: 5, // Minimum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  },
});
```

### Query Optimization

Use indexes and optimize queries:

```typescript
// Use indexes
@Table("users")
class User {
  @Column({ primaryKey: true })
  public id!: number;

  @Column({ index: true }) // Add index
  public email!: string;
}

// Use select specific fields
const users = await db.select("id", "name").from("users").where("active", true);

// Use pagination
const users = await db
  .select()
  .from("users")
  .limit(20)
  .offset((page - 1) * 20);
```

### Batch Operations

Use batch operations for multiple inserts/updates:

```typescript
// Batch insert
await db.batchInsert("users", [
  { name: "User 1", email: "user1@example.com" },
  { name: "User 2", email: "user2@example.com" },
]);

// Batch update
await db.transaction(async (trx) => {
  for (const user of users) {
    await trx("users").where("id", user.id).update(user);
  }
});
```

## Middleware Optimization

### Minimize Middleware

Only use necessary middleware:

```typescript
// ❌ Too many middleware
app.use(middleware1);
app.use(middleware2);
app.use(middleware3);
app.use(middleware4);
app.use(middleware5);

// ✅ Combine or remove unnecessary middleware
app.use(combinedMiddleware);
```

### Conditional Middleware

Use conditional middleware for better performance:

```typescript
app.use(async (ctx, next) => {
  // Skip middleware for static files
  if (ctx.path.startsWith("/static")) {
    return await next();
  }
  // Apply middleware
  return await middleware(ctx, next);
});
```

### Async Middleware

Ensure middleware is properly async:

```typescript
// ✅ Correct: Properly await next()
app.use(async (ctx, next) => {
  const start = Date.now();
  const response = await next();
  const duration = Date.now() - start;
  console.log(`Request took ${duration}ms`);
  return response;
});

// ❌ Wrong: Not awaiting next()
app.use(async (ctx, next) => {
  next(); // Missing await
  return new Response("ok");
});
```

## Response Optimization

### Compression

Enable gzip compression in reverse proxy (Nginx, Caddy):

```nginx
# Nginx
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types text/plain text/css application/json application/javascript;
```

### Response Streaming

Use streaming for large responses:

```typescript
@GET('/large-data')
public async getLargeData() {
  const stream = new ReadableStream({
    async start(controller) {
      // Stream data in chunks
      for (const chunk of largeData) {
        controller.enqueue(JSON.stringify(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
```

### Pagination

Always paginate large datasets:

```typescript
@GET('/users')
public async getUsers(
  @Query('page') page: number = 1,
  @Query('limit') limit: number = 20,
) {
  const offset = (page - 1) * limit;
  const users = await this.userService.findAll({ limit, offset });
  return {
    data: users,
    pagination: {
      page,
      limit,
      total: await this.userService.count(),
    },
  };
}
```

## Memory Management

### Avoid Memory Leaks

Clean up resources properly:

```typescript
// Clean up in afterEach/afterAll
afterEach(async () => {
  await app.stop();
  ModuleRegistry.getInstance().clear();
  RouteRegistry.getInstance().clear();
});

// Clear intervals/timeouts
const intervalId = setInterval(() => {}, 1000);
// ... later
clearInterval(intervalId);
```

### Use TTL for Cache

Set appropriate TTL for cache entries:

```typescript
CacheModule.forRoot({
  defaultTtl: 3600000, // 1 hour
});

// Override for specific entries
await cache.set("key", "value", 60000); // 1 minute
```

### Monitor Memory Usage

Monitor memory usage in production:

```typescript
import { performance } from "node:perf_hooks";

setInterval(() => {
  const usage = process.memoryUsage();
  console.log({
    heapUsed: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
    heapTotal: `${Math.round(usage.heapTotal / 1024 / 1024)}MB`,
    rss: `${Math.round(usage.rss / 1024 / 1024)}MB`,
  });
}, 60000); // Every minute
```

## Concurrency

### Use Async/Await

Always use async/await for I/O operations:

```typescript
// ✅ Correct: Async
@GET('/users')
public async getUsers() {
  return await this.userService.findAll();
}

// ❌ Wrong: Synchronous
@GET('/users')
public getUsers() {
  return this.userService.findAllSync();  // Blocks event loop
}
```

### Parallel Operations

Use `Promise.all()` for parallel operations:

```typescript
// ✅ Parallel execution
const [user, profile, settings] = await Promise.all([
  this.userService.find(id),
  this.profileService.find(id),
  this.settingsService.find(id),
]);

// ❌ Sequential execution
const user = await this.userService.find(id);
const profile = await this.profileService.find(id);
const settings = await this.settingsService.find(id);
```

### Worker Threads

Use worker threads for CPU-intensive tasks:

```typescript
import { Worker } from 'worker_threads';

@POST('/process')
public async processData(@Body() data: any) {
  return await new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js', {
      workerData: data,
    });
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
```

## Best Practices Summary

1. **Cache frequently accessed data** - Use CacheModule with appropriate TTL
2. **Optimize database queries** - Use indexes, pagination, batch operations
3. **Minimize middleware** - Only use necessary middleware
4. **Use async/await** - Never block the event loop
5. **Enable compression** - Use gzip/brotli compression
6. **Monitor performance** - Use PerformanceHarness and monitoring tools
7. **Clean up resources** - Properly clean up in tests and shutdown handlers
8. **Use connection pooling** - Configure appropriate pool sizes
9. **Stream large responses** - Use streaming for large data
10. **Parallelize operations** - Use Promise.all() for independent operations

## Performance Checklist

- [ ] Caching enabled for frequently accessed data
- [ ] Database connection pooling configured
- [ ] Database queries optimized (indexes, pagination)
- [ ] Middleware minimized and optimized
- [ ] Compression enabled (gzip/brotli)
- [ ] Async/await used for all I/O operations
- [ ] Memory leaks prevented (cleanup handlers)
- [ ] Performance monitoring enabled
- [ ] Large responses paginated or streamed
- [ ] Parallel operations used where possible
