# 微服务架构支持

Bun Server Framework 提供了完整的微服务架构支持，包括配置中心、服务注册与发现、服务调用、服务治理和可观测性等功能。

## 目录

- [快速开始](#快速开始)
- [配置中心](#配置中心)
- [服务注册与发现](#服务注册与发现)
- [服务调用](#服务调用)
- [服务治理](#服务治理)
- [监控和追踪](#监控和追踪)
- [最佳实践](#最佳实践)

## 快速开始

### 安装依赖

```bash
bun add @dangao/bun-server
```

### 基础示例

```typescript
import { Application } from '@dangao/bun-server';
import {
  ConfigCenterModule,
  ServiceRegistryModule,
  ServiceClient,
} from '@dangao/bun-server';

// 创建应用
const app = new Application();

// 注册配置中心模块
app.registerModule(
  ConfigCenterModule.forRoot({
    provider: 'nacos',
    nacos: {
      client: {
        serverList: ['http://localhost:8848'],
        namespaceId: 'public',
        username: 'nacos',
        password: 'nacos',
      },
    },
  }),
);

// 注册服务注册中心模块
app.registerModule(
  ServiceRegistryModule.forRoot({
    provider: 'nacos',
    nacos: {
      client: {
        serverList: ['http://localhost:8848'],
        namespaceId: 'public',
        username: 'nacos',
        password: 'nacos',
      },
    },
  }),
);

// 启动应用
await app.listen(3000);
```

## 配置中心

### 基本使用

```typescript
import {
  ConfigCenterModule,
  CONFIG_CENTER_TOKEN,
  type ConfigCenter,
} from '@dangao/bun-server';
import { Inject, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  public constructor(
    @Inject(CONFIG_CENTER_TOKEN) private readonly configCenter: ConfigCenter,
  ) {}

  public async getConfig() {
    const config = await this.configCenter.getConfig(
      'my-config',
      'DEFAULT_GROUP',
    );
    return JSON.parse(config.content);
  }
}
```

### 使用装饰器

```typescript
import { ConfigCenterValue, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  @ConfigCenterValue('my-config', 'DEFAULT_GROUP', {
    defaultValue: 'default-value',
    watch: true, // 监听配置变更
  })
  public configValue: string = '';

  public getConfig() {
    return this.configValue; // 自动从配置中心获取
  }
}
```

### 配置热更新

配置中心支持配置热更新，当配置变更时会自动通知应用：

```typescript
const configCenter = container.resolve<ConfigCenter>(CONFIG_CENTER_TOKEN);

configCenter.watchConfig('my-config', 'DEFAULT_GROUP', (newConfig) => {
  console.log('Config updated:', newConfig.content);
  // 更新应用配置
});
```

### ConfigModule 集成

ConfigModule 支持与配置中心深度集成，配置变更会自动刷新：

```typescript
import { ConfigModule } from '@dangao/bun-server';

ConfigModule.forRoot({
  defaultConfig: { app: { name: 'MyApp' } },
  configCenter: {
    enabled: true,
    configs: new Map([
      ['app.name', { dataId: 'app-name', groupName: 'DEFAULT_GROUP' }],
      ['app.port', { dataId: 'app-port', groupName: 'DEFAULT_GROUP' }],
    ]),
    configCenterPriority: true, // 配置中心配置优先级最高
  },
});
```

## 服务注册与发现

### 服务注册

#### 使用装饰器自动注册

```typescript
import { ServiceRegistry, Controller, GET } from '@dangao/bun-server';

@ServiceRegistry('user-service', {
  port: 3000,
  weight: 100,
  metadata: { version: '1.0.0' },
})
@Controller('/api/users')
class UserController {
  @GET('/')
  public getUsers() {
    return { users: [] };
  }
}

// 应用启动时会自动注册服务
const app = new Application();
app.registerController(UserController);
await app.listen(3000);
```

#### 手动注册

```typescript
import {
  ServiceRegistryModule,
  SERVICE_REGISTRY_TOKEN,
  type ServiceRegistry,
} from '@dangao/bun-server';
import { Inject, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  public constructor(
    @Inject(SERVICE_REGISTRY_TOKEN) private readonly registry: ServiceRegistry,
  ) {}

  public async registerService() {
    await this.registry.register({
      serviceName: 'my-service',
      ip: '127.0.0.1',
      port: 3000,
      weight: 100,
      healthy: true,
    });
  }
}
```

### 服务发现

#### 使用装饰器自动发现

```typescript
import { ServiceDiscovery, Injectable } from '@dangao/bun-server';
import type { ServiceInstance } from '@dangao/bun-server';

@Injectable()
class MyService {
  @ServiceDiscovery('user-service', {
    healthyOnly: true, // 只获取健康实例
  })
  public instances: ServiceInstance[] = [];

  public async getAvailableInstances() {
    // instances 会自动更新
    return this.instances;
  }
}
```

#### 手动发现

```typescript
const instances = await serviceRegistry.getInstances('user-service', {
  healthyOnly: true,
  namespaceId: 'public',
});

// 监听服务实例变更
serviceRegistry.watchInstances('user-service', (newInstances) => {
  console.log('Instances updated:', newInstances);
});
```

### 健康检查集成

服务注册会自动集成健康检查模块，根据健康检查状态更新服务健康状态：

```typescript
import { HealthModule } from '@dangao/bun-server';

// 注册健康检查模块
HealthModule.forRoot({
  indicators: [
    {
      name: 'db',
      async check() {
        // 检查数据库连接
        return { status: 'up' };
      },
    },
  ],
});

// 使用 @ServiceRegistry 装饰器的服务会自动根据健康检查状态更新
```

## 服务调用

### 基本使用

```typescript
import {
  ServiceClient,
  SERVICE_REGISTRY_TOKEN,
  type ServiceRegistry,
} from '@dangao/bun-server';
import { Inject, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  private readonly serviceClient: ServiceClient;

  public constructor(
    @Inject(SERVICE_REGISTRY_TOKEN) serviceRegistry: ServiceRegistry,
  ) {
    this.serviceClient = new ServiceClient(serviceRegistry);
  }

  public async callUserService() {
    const response = await this.serviceClient.call({
      serviceName: 'user-service',
      method: 'GET',
      path: '/api/users',
    });

    return response.data;
  }
}
```

### 使用装饰器注入

```typescript
import { ServiceClient, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  public constructor(
    @ServiceClient() private readonly serviceClient: ServiceClient,
  ) {}

  public async callUserService() {
    return await this.serviceClient.call({
      serviceName: 'user-service',
      method: 'GET',
      path: '/api/users',
    });
  }
}
```

### 负载均衡

ServiceClient 支持多种负载均衡策略：

```typescript
// 随机负载均衡
await serviceClient.call({
  serviceName: 'user-service',
  method: 'GET',
  path: '/api/users',
  loadBalanceStrategy: 'random',
});

// 轮询负载均衡
await serviceClient.call({
  serviceName: 'user-service',
  method: 'GET',
  path: '/api/users',
  loadBalanceStrategy: 'roundRobin',
});

// 加权轮询
await serviceClient.call({
  serviceName: 'user-service',
  method: 'GET',
  path: '/api/users',
  loadBalanceStrategy: 'weightedRoundRobin',
});

// 一致性哈希（适用于需要会话粘性的场景）
await serviceClient.call({
  serviceName: 'user-service',
  method: 'GET',
  path: '/api/users',
  loadBalanceStrategy: 'consistentHash',
  consistentHashKey: 'user-id-123',
});

// 最少连接
await serviceClient.call({
  serviceName: 'user-service',
  method: 'GET',
  path: '/api/users',
  loadBalanceStrategy: 'leastActive',
});
```

### 流式调用

支持 Server-Sent Events 等流式响应：

```typescript
const stream = await serviceClient.callStream({
  serviceName: 'stream-service',
  method: 'GET',
  path: '/api/events',
});

// 读取流数据
const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log('Received:', new TextDecoder().decode(value));
}
```

### 拦截器

#### 请求拦截器

```typescript
import {
  TraceIdRequestInterceptor,
  RequestLogInterceptor,
} from '@dangao/bun-server';

serviceClient.addRequestInterceptor(new TraceIdRequestInterceptor());
serviceClient.addRequestInterceptor(new RequestLogInterceptor());

// 自定义请求拦截器
serviceClient.addRequestInterceptor({
  async intercept(options) {
    options.headers = {
      ...options.headers,
      'X-Custom-Header': 'value',
    };
    return options;
  },
});
```

#### 响应拦截器

```typescript
import {
  ResponseLogInterceptor,
  ErrorHandlerInterceptor,
} from '@dangao/bun-server';

serviceClient.addResponseInterceptor(new ResponseLogInterceptor());
serviceClient.addResponseInterceptor(new ErrorHandlerInterceptor());

// 自定义响应拦截器
serviceClient.addResponseInterceptor({
  async intercept(response) {
    // 转换响应数据
    return {
      ...response,
      data: transformData(response.data),
    };
  },
});
```

## 服务治理

### 熔断器

#### 使用装饰器

```typescript
import { CircuitBreaker, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  @CircuitBreaker({
    failureThreshold: 0.5,
    timeWindow: 60000,
    minimumRequests: 10,
  }, 'fallbackMethod')
  public async callExternalService() {
    // 自动应用熔断保护
    return await externalService.call();
  }

  private async fallbackMethod() {
    return { message: 'Fallback response' };
  }
}
```

#### 手动使用

```typescript
import { CircuitBreaker } from '@dangao/bun-server';

const circuitBreaker = new CircuitBreaker({
  failureThreshold: 0.5,
  timeWindow: 60000,
});

const result = await circuitBreaker.execute(
  async () => {
    return await serviceClient.call(options);
  },
  async () => {
    // 降级处理
    return { fallback: true };
  },
);
```

### 限流

#### 内存限流

```typescript
import { RateLimiter } from '@dangao/bun-server';

const rateLimiter = new RateLimiter({
  requestsPerSecond: 100,
  timeWindow: 1000,
});

const allowed = await rateLimiter.allow('service-key');
if (!allowed) {
  throw new Error('Rate limit exceeded');
}
```

#### 分布式限流（Redis）

```typescript
import { RedisRateLimiter } from '@dangao/bun-server';

// 需要提供 Redis 客户端
const redisClient = {
  get: async (key: string) => await redis.get(key),
  set: async (key: string, value: string, options?: any) => {
    await redis.set(key, value, options);
  },
  del: async (key: string) => await redis.del(key),
  incr: async (key: string) => await redis.incr(key),
  expire: async (key: string, seconds: number) => {
    await redis.expire(key, seconds);
  },
  exists: async (key: string) => await redis.exists(key),
};

const rateLimiter = new RedisRateLimiter(
  { client: redisClient },
  {
    requestsPerSecond: 100,
    timeWindow: 1000,
  },
);

const allowed = await rateLimiter.allow('service-key');
```

### 重试策略

```typescript
import {
  FixedIntervalRetryStrategy,
  ExponentialBackoffRetryStrategy,
} from '@dangao/bun-server';

// 固定间隔重试
const fixedRetry = new FixedIntervalRetryStrategy({
  maxRetries: 3,
  retryDelay: 1000,
});

// 指数退避重试
const exponentialRetry = new ExponentialBackoffRetryStrategy({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
});

// 在 ServiceClient 中使用
serviceClient.setDefaultRetryStrategy({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  shouldRetry: (error) => {
    // 只对网络错误重试
    return error.message.includes('timeout') || error.message.includes('network');
  },
});
```

## 监控和追踪

### 分布式追踪

```typescript
import {
  Tracer,
  ConsoleTraceCollector,
  SpanKind,
} from '@dangao/bun-server';

const tracer = new Tracer({
  samplingRate: 1.0,
  enabled: true,
});

tracer.addCollector(new ConsoleTraceCollector());

// 在 ServiceClient 中使用
serviceClient.setTracer(tracer);

// 手动创建 Span
const span = tracer.startSpan('my-operation', SpanKind.INTERNAL);
tracer.setSpanTags(span.context.spanId, {
  'operation.name': 'process-data',
  'user.id': '123',
});
// ... 执行操作
tracer.endSpan(span.context.spanId, SpanStatus.OK);
```

### 服务监控

```typescript
import { ServiceMetricsCollector } from '@dangao/bun-server';

const metricsCollector = new ServiceMetricsCollector({
  enabled: true,
  autoReportToMetrics: true, // 自动上报到 MetricsModule
});

// 在 ServiceClient 中使用
serviceClient.setMetricsCollector(metricsCollector);

// 查询指标
const allMetrics = metricsCollector.getAllMetrics();
const healthStatus = metricsCollector.getAllHealthStatus();
```

### Prometheus 集成

服务监控指标会自动上报到 MetricsModule，通过 `/metrics` 端点导出 Prometheus 格式：

```typescript
import { MetricsModule } from '@dangao/bun-server';

MetricsModule.forRoot({
  enableHttpMetrics: true,
});

// 访问 http://localhost:3000/metrics 获取 Prometheus 格式指标
```

导出的指标包括：
- `service_calls_total` - 服务调用总数
- `service_calls_success_total` - 成功调用数
- `service_calls_failure_total` - 失败调用数
- `service_call_latency_avg_ms` - 平均延迟
- `service_call_latency_min_ms` - 最小延迟
- `service_call_latency_max_ms` - 最大延迟
- `service_call_error_rate` - 错误率
- `service_instance_healthy` - 实例健康状态
- `service_instance_consecutive_failures` - 连续失败次数

## 最佳实践

### 1. 配置管理

- 使用配置中心管理动态配置
- 为不同环境使用不同的命名空间
- 启用配置监听以实现热更新
- 设置合理的配置优先级

### 2. 服务注册

- 使用 `@ServiceRegistry` 装饰器自动注册
- 配置合理的服务元数据（版本、权重等）
- 启用健康检查集成
- 确保应用关闭时正确注销服务

### 3. 服务调用

- 选择合适的负载均衡策略
- 配置合理的超时时间
- 使用拦截器统一处理请求/响应
- 启用追踪和监控

### 4. 服务治理

- 为关键服务启用熔断器
- 配置合理的限流策略
- 实现降级处理逻辑
- 使用重试策略处理临时故障

### 5. 可观测性

- 启用分布式追踪
- 配置合理的采样率
- 集成 Prometheus 监控
- 设置告警规则

## 更多资源

- [配置中心使用指南](./microservice-config-center.md)
- [服务注册与发现使用指南](./microservice-service-registry.md)
- [Nacos 集成文档](./microservice-nacos.md)

