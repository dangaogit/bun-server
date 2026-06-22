# Microservice Architecture Support

Bun Server Framework provides comprehensive microservice architecture support, including configuration center, service registration and discovery, service invocation, service governance, and observability features.

## Table of Contents

- [Quick Start](#quick-start)
- [Configuration Center](#configuration-center)
- [Service Registration and Discovery](#service-registration-and-discovery)
- [Service Invocation](#service-invocation)
- [Service Governance](#service-governance)
- [Monitoring and Tracing](#monitoring-and-tracing)
- [Best Practices](#best-practices)

## Quick Start

### Install Dependencies

```bash
bun add @dangao/bun-server
```

### Basic Example

```typescript
import { Application } from '@dangao/bun-server';
import {
  ConfigCenterModule,
  ServiceRegistryModule,
  ServiceClient,
} from '@dangao/bun-server';

// Create application
const app = new Application();

// Register configuration center module
app.registerModule(
  ConfigCenterModule.forRoot({
    provider: 'nacos',
    nacos: {
      client: {
        serverList: ['http://localhost:8848'],
        username: 'nacos',
        password: 'nacos',
      },
    },
  }),
);

// Register service registry module
app.registerModule(
  ServiceRegistryModule.forRoot({
    provider: 'nacos',
    nacos: {
      client: {
        serverList: ['http://localhost:8848'],
        username: 'nacos',
        password: 'nacos',
      },
    },
  }),
);

// Start application
await app.listen(3000);
```

## Configuration Center

### Basic Usage

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

### Using Decorators

```typescript
import { ConfigCenterValue, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  @ConfigCenterValue('my-config', 'DEFAULT_GROUP', {
    defaultValue: 'default-value',
    watch: true, // Watch for configuration changes
  })
  public configValue: string = '';

  public getConfig() {
    return this.configValue; // Automatically fetched from config center
  }
}
```

### Hot Configuration Update

The configuration center supports hot configuration updates, automatically notifying the application when configurations change:

```typescript
const configCenter = container.resolve<ConfigCenter>(CONFIG_CENTER_TOKEN);

configCenter.watchConfig('my-config', 'DEFAULT_GROUP', (newConfig) => {
  console.log('Config updated:', newConfig.content);
  // Update application configuration
});
```

### ConfigModule Integration

ConfigModule supports deep integration with the configuration center, automatically refreshing when configurations change:

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
    configCenterPriority: true, // Config center has highest priority
  },
});
```

## Service Registration and Discovery

### Service Registration

#### Automatic Registration with Decorator

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

// Service will be automatically registered when application starts
const app = new Application();
app.registerController(UserController);
await app.listen(3000);
```

#### Manual Registration

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

### Service Discovery

#### Automatic Discovery with Decorator

```typescript
import { ServiceDiscovery, Injectable } from '@dangao/bun-server';
import type { ServiceInstance } from '@dangao/bun-server';

@Injectable()
class MyService {
  @ServiceDiscovery('user-service', {
    healthyOnly: true, // Only get healthy instances
  })
  public instances: ServiceInstance[] = [];

  public async getAvailableInstances() {
    // instances will be automatically updated
    return this.instances;
  }
}
```

#### Manual Discovery

```typescript
const instances = await serviceRegistry.getInstances('user-service', {
  healthyOnly: true,
});

// Watch for service instance changes
serviceRegistry.watchInstances('user-service', (newInstances) => {
  console.log('Instances updated:', newInstances);
});
```

### Health Check Integration

Service registration automatically integrates with the health check module, updating service health status based on health check results:

```typescript
import { HealthModule } from '@dangao/bun-server';

// Register health check module
HealthModule.forRoot({
  indicators: [
    {
      name: 'db',
      async check() {
        // Check database connection
        return { status: 'up' };
      },
    },
  ],
});

// Services using @ServiceRegistry decorator will automatically update based on health check status
```

## Service Invocation

### Basic Usage

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

### Using Decorator Injection

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

### Load Balancing

ServiceClient supports multiple load balancing strategies:

```typescript
// Random load balancing
await serviceClient.call({
  serviceName: 'user-service',
  method: 'GET',
  path: '/api/users',
  loadBalanceStrategy: 'random',
});

// Round-robin load balancing
await serviceClient.call({
  serviceName: 'user-service',
  method: 'GET',
  path: '/api/users',
  loadBalanceStrategy: 'roundRobin',
});

// Weighted round-robin
await serviceClient.call({
  serviceName: 'user-service',
  method: 'GET',
  path: '/api/users',
  loadBalanceStrategy: 'weightedRoundRobin',
});

// Consistent hashing (for scenarios requiring session affinity)
await serviceClient.call({
  serviceName: 'user-service',
  method: 'GET',
  path: '/api/users',
  loadBalanceStrategy: 'consistentHash',
  consistentHashKey: 'user-id-123',
});

// Least active
await serviceClient.call({
  serviceName: 'user-service',
  method: 'GET',
  path: '/api/users',
  loadBalanceStrategy: 'leastActive',
});
```

### Streaming Calls

Supports streaming responses like Server-Sent Events:

```typescript
const stream = await serviceClient.callStream({
  serviceName: 'stream-service',
  method: 'GET',
  path: '/api/events',
});

// Read stream data
const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log('Received:', new TextDecoder().decode(value));
}
```

### Interceptors

#### Request Interceptors

```typescript
import {
  TraceIdRequestInterceptor,
  RequestLogInterceptor,
} from '@dangao/bun-server';

serviceClient.addRequestInterceptor(new TraceIdRequestInterceptor());
serviceClient.addRequestInterceptor(new RequestLogInterceptor());

// Custom request interceptor
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

#### Response Interceptors

```typescript
import {
  ResponseLogInterceptor,
  ErrorHandlerInterceptor,
} from '@dangao/bun-server';

serviceClient.addResponseInterceptor(new ResponseLogInterceptor());
serviceClient.addResponseInterceptor(new ErrorHandlerInterceptor());

// Custom response interceptor
serviceClient.addResponseInterceptor({
  async intercept(response) {
    // Transform response data
    return {
      ...response,
      data: transformData(response.data),
    };
  },
});
```

## Service Governance

### Circuit Breaker

#### Using Decorator

```typescript
import { CircuitBreaker, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  @CircuitBreaker(
    {
      failureThreshold: 0.5,
      timeWindow: 60000,
      minimumRequests: 10,
    },
    'fallbackMethod',
  )
  public async callExternalService() {
    // Automatically applies circuit breaker protection
    return await externalService.call();
  }

  private async fallbackMethod() {
    return { message: 'Fallback response' };
  }
}
```

#### Manual Usage

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
    // Fallback handling
    return { fallback: true };
  },
);
```

### Rate Limiting

#### In-Memory Rate Limiting

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

#### Distributed Rate Limiting (Redis)

```typescript
import { RedisRateLimiter } from '@dangao/bun-server';

// Redis client needs to be provided
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

### Retry Strategy

```typescript
import {
  FixedIntervalRetryStrategy,
  ExponentialBackoffRetryStrategy,
} from '@dangao/bun-server';

// Fixed interval retry
const fixedRetry = new FixedIntervalRetryStrategy({
  maxRetries: 3,
  retryDelay: 1000,
});

// Exponential backoff retry
const exponentialRetry = new ExponentialBackoffRetryStrategy({
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
});

// Use in ServiceClient
serviceClient.setDefaultRetryStrategy({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  shouldRetry: (error) => {
    // Only retry on network errors
    return (
      error.message.includes('timeout') ||
      error.message.includes('network')
    );
  },
});
```

## Monitoring and Tracing

### Distributed Tracing

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

// Use in ServiceClient
serviceClient.setTracer(tracer);

// Manually create span
const span = tracer.startSpan('my-operation', SpanKind.INTERNAL);
tracer.setSpanTags(span.context.spanId, {
  'operation.name': 'process-data',
  'user.id': '123',
});
// ... execute operation
tracer.endSpan(span.context.spanId, SpanStatus.OK);
```

### Service Monitoring

```typescript
import { ServiceMetricsCollector } from '@dangao/bun-server';

const metricsCollector = new ServiceMetricsCollector({
  enabled: true,
  autoReportToMetrics: true, // Automatically report to MetricsModule
});

// Use in ServiceClient
serviceClient.setMetricsCollector(metricsCollector);

// Query metrics
const allMetrics = metricsCollector.getAllMetrics();
const healthStatus = metricsCollector.getAllHealthStatus();
```

### Prometheus Integration

Service monitoring metrics are automatically reported to MetricsModule and exported in Prometheus format via the `/metrics` endpoint:

```typescript
import { MetricsModule } from '@dangao/bun-server';

MetricsModule.forRoot({
  enableHttpMetrics: true,
});

// Access http://localhost:3000/metrics to get Prometheus format metrics
```

Exported metrics include:
- `service_calls_total` - Total service calls
- `service_calls_success_total` - Successful calls
- `service_calls_failure_total` - Failed calls
- `service_call_latency_avg_ms` - Average latency
- `service_call_latency_min_ms` - Minimum latency
- `service_call_latency_max_ms` - Maximum latency
- `service_call_error_rate` - Error rate
- `service_instance_healthy` - Instance health status
- `service_instance_consecutive_failures` - Consecutive failures

## Best Practices

### 1. Configuration Management

- Use configuration center to manage dynamic configurations
- Use different namespaces for different environments
- Enable configuration watching for hot updates
- Set reasonable configuration priorities

### 2. Service Registration

- Use `@ServiceRegistry` decorator for automatic registration
- Configure reasonable service metadata (version, weight, etc.)
- Enable health check integration
- Ensure services are properly deregistered when application shuts down

### 3. Service Invocation

- Choose appropriate load balancing strategy
- Configure reasonable timeout values
- Use interceptors for unified request/response handling
- Enable tracing and monitoring

### 4. Service Governance

- Enable circuit breaker for critical services
- Configure reasonable rate limiting strategies
- Implement fallback handling logic
- Use retry strategies for temporary failures

### 5. Observability

- Enable distributed tracing
- Configure reasonable sampling rates
- Integrate Prometheus monitoring
- Set up alerting rules

## More Resources

- [Configuration Center Guide](./zh/microservice-config-center.md)
- [Service Registration and Discovery Guide](./zh/microservice-service-registry.md)
- [Nacos Integration Documentation](./zh/microservice-nacos.md)
