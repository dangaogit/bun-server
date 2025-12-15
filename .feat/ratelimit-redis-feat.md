# @dangao/bun-server RateLimit Redis 后端支持功能请求

## 问题描述

当前 `@dangao/bun-server` 框架的 RateLimit 中间件仅支持内存存储，在分布式环境中无法共享限流状态。这导致以下问题：

1. **无法分布式限流**：多个服务实例无法共享限流计数
2. **内存存储限制**：重启服务后限流状态丢失
3. **无法持久化**：无法跨服务实例共享限流数据

## 功能需求

### 1. Redis 后端支持

框架应支持使用 Redis 作为 RateLimit 存储后端。

**期望实现**：

```typescript
RateLimitModule.forRoot({
  store: new RedisRateLimitStore({
    host: 'localhost',
    port: 6379,
  }),
});
```

### 2. RedisRateLimitStore 实现

框架应提供 `RedisRateLimitStore` 实现。

**期望实现**：

```typescript
export class RedisRateLimitStore implements RateLimitStore {
  constructor(private readonly redis: RedisClient) {}

  async increment(key: string, windowMs: number): Promise<number> {
    // 使用 Redis 实现限流计数
  }

  async reset(key: string): Promise<void> {
    // 重置限流计数
  }
}
```

### 3. 分布式限流支持

框架应支持在分布式环境中共享限流状态。

**期望实现**：

- 多个服务实例共享限流计数
- 支持 Redis 集群模式
- 支持限流状态持久化

## 详细设计

### RedisRateLimitStore 接口

```typescript
export interface RedisRateLimitStoreOptions {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
}
```

### Redis 实现

- 使用 Redis 的原子操作实现限流计数
- 使用 Redis TTL 实现时间窗口
- 支持 Redis 连接池和故障转移

## 实现检查清单

### Redis 后端实现

- [ ] 实现 `RedisRateLimitStore` 类
- [ ] Redis 连接管理
- [ ] 限流计数实现
- [ ] 时间窗口实现

### 分布式限流支持

- [ ] 多实例限流共享
- [ ] Redis 集群支持
- [ ] 故障转移处理

### 文档和测试

- [ ] 更新 RateLimit 文档
- [ ] 添加 Redis 配置示例
- [ ] 添加单元测试和集成测试

## 相关文件

### Redis RateLimit 相关

- `src/middleware/builtin/rate-limit.ts` - 修改支持 Redis Store
- `src/middleware/builtin/redis-rate-limit-store.ts` - RedisRateLimitStore 实现
- `src/middleware/builtin/types.ts` - Redis 相关类型定义

## 优先级

**低优先级** - 这是可选功能，根据需求决定是否实现。

