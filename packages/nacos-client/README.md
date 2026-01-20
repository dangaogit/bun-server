# @dangao/nacos-client

A lightweight Nacos 3.X Open API client for Bun runtime, supporting
configuration management and service discovery.

## Features

- **Configuration Management** - Get configurations from Nacos config center
- **Service Discovery** - Register, deregister, and query service instances
- **High Availability** - Automatic server failover and retry mechanism
- **TypeScript Native** - Full TypeScript support with complete type definitions
- **Bun Optimized** - Designed specifically for Bun runtime

## Installation

```bash
bun add @dangao/nacos-client
```

## Quick Start

### Configuration Management

```typescript
import { NacosClient, NacosConfigClient } from "@dangao/nacos-client";

// Create client
const client = new NacosClient({
  serverList: ["http://localhost:8848"],
  namespaceId: "public",
  username: "nacos",
  password: "nacos",
});

const configClient = new NacosConfigClient(client);

// Get configuration
const config = await configClient.getConfig({
  dataId: "application.yaml",
  groupName: "DEFAULT_GROUP",
});

console.log(config.content); // Configuration content
console.log(config.md5); // Configuration MD5 hash
console.log(config.contentType); // Content type
```

### Service Discovery

```typescript
import { NacosClient, NacosServiceClient } from "@dangao/nacos-client";

const client = new NacosClient({
  serverList: ["http://localhost:8848"],
  namespaceId: "public",
});

const serviceClient = new NacosServiceClient(client);

// Register service instance
await serviceClient.registerInstance({
  serviceName: "my-service",
  ip: "192.168.1.100",
  port: 8080,
  weight: 1,
  enabled: true,
  metadata: {
    version: "1.0.0",
    env: "production",
  },
});

// Query service instances
const instances = await serviceClient.getInstances({
  serviceName: "my-service",
  healthyOnly: true,
});

console.log(instances);

// Deregister service instance
await serviceClient.deregisterInstance("my-service", "192.168.1.100", 8080);
```

## API Reference

### NacosClient

The base HTTP client that handles communication with Nacos server.

#### Constructor Options

| Option        | Type       | Required | Default | Description                           |
| ------------- | ---------- | -------- | ------- | ------------------------------------- |
| `serverList`  | `string[]` | Yes      | -       | Nacos server addresses                |
| `namespaceId` | `string`   | No       | -       | Namespace ID                          |
| `username`    | `string`   | No       | -       | Username for authentication           |
| `password`    | `string`   | No       | -       | Password for authentication           |
| `timeout`     | `number`   | No       | `5000`  | Request timeout in milliseconds       |
| `retryCount`  | `number`   | No       | `3`     | Number of retry attempts              |
| `retryDelay`  | `number`   | No       | `1000`  | Delay between retries in milliseconds |

### NacosConfigClient

Client for configuration management operations.

#### Methods

##### `getConfig(options: GetConfigOptions): Promise<ConfigResult>`

Get configuration from Nacos config center.

**Options:**

| Field         | Type     | Required | Description                             |
| ------------- | -------- | -------- | --------------------------------------- |
| `dataId`      | `string` | Yes      | Configuration ID                        |
| `groupName`   | `string` | Yes      | Configuration group                     |
| `namespaceId` | `string` | No       | Namespace ID (overrides client setting) |

**Returns:** `ConfigResult`

| Field          | Type     | Description                 |
| -------------- | -------- | --------------------------- |
| `content`      | `string` | Configuration content       |
| `md5`          | `string` | MD5 hash of the content     |
| `lastModified` | `number` | Last modification timestamp |
| `contentType`  | `string` | Content type                |

### NacosServiceClient

Client for service registration and discovery operations.

#### Methods

##### `registerInstance(options: RegisterInstanceOptions): Promise<void>`

Register a service instance.

**Options:**

| Field         | Type                     | Required | Description                         |
| ------------- | ------------------------ | -------- | ----------------------------------- |
| `serviceName` | `string`                 | Yes      | Service name                        |
| `ip`          | `string`                 | Yes      | Instance IP address                 |
| `port`        | `number`                 | Yes      | Instance port                       |
| `weight`      | `number`                 | No       | Instance weight                     |
| `enabled`     | `boolean`                | No       | Whether instance is enabled         |
| `metadata`    | `Record<string, string>` | No       | Instance metadata                   |
| `clusterName` | `string`                 | No       | Cluster name                        |
| `namespaceId` | `string`                 | No       | Namespace ID                        |
| `groupName`   | `string`                 | No       | Group name                          |
| `heartBeat`   | `boolean`                | No       | Whether this is a heartbeat request |

##### `deregisterInstance(serviceName, ip, port, options?): Promise<void>`

Deregister a service instance.

**Parameters:**

| Parameter             | Type     | Required | Description         |
| --------------------- | -------- | -------- | ------------------- |
| `serviceName`         | `string` | Yes      | Service name        |
| `ip`                  | `string` | Yes      | Instance IP address |
| `port`                | `number` | Yes      | Instance port       |
| `options.namespaceId` | `string` | No       | Namespace ID        |
| `options.groupName`   | `string` | No       | Group name          |
| `options.clusterName` | `string` | No       | Cluster name        |

##### `getInstances(options: GetInstancesOptions): Promise<ServiceInstance[]>`

Query service instances.

**Options:**

| Field         | Type      | Required | Description                   |
| ------------- | --------- | -------- | ----------------------------- |
| `serviceName` | `string`  | Yes      | Service name                  |
| `namespaceId` | `string`  | No       | Namespace ID                  |
| `groupName`   | `string`  | No       | Group name                    |
| `clusterName` | `string`  | No       | Cluster name                  |
| `healthyOnly` | `boolean` | No       | Only return healthy instances |

**Returns:** `ServiceInstance[]`

| Field         | Type                     | Description       |
| ------------- | ------------------------ | ----------------- |
| `serviceName` | `string`                 | Service name      |
| `ip`          | `string`                 | Instance IP       |
| `port`        | `number`                 | Instance port     |
| `weight`      | `number`                 | Instance weight   |
| `healthy`     | `boolean`                | Health status     |
| `enabled`     | `boolean`                | Enabled status    |
| `metadata`    | `Record<string, string>` | Instance metadata |
| `clusterName` | `string`                 | Cluster name      |
| `namespaceId` | `string`                 | Namespace ID      |
| `groupName`   | `string`                 | Group name        |

## Error Handling

The client throws `NacosClientError` for all errors:

```typescript
import { NacosClientError } from "@dangao/nacos-client";

try {
  const config = await configClient.getConfig({
    dataId: "non-existent",
    groupName: "DEFAULT_GROUP",
  });
} catch (error) {
  if (error instanceof NacosClientError) {
    console.error("Nacos error:", error.message);
    console.error("Cause:", error.cause);
  }
}
```

## High Availability

The client supports multiple Nacos servers for high availability:

```typescript
const client = new NacosClient({
  serverList: [
    "http://nacos1:8848",
    "http://nacos2:8848",
    "http://nacos3:8848",
  ],
  retryCount: 3,
  retryDelay: 1000,
});
```

When a server is unavailable, the client automatically switches to the next
server in the list and retries the request.

## Integration with @dangao/bun-server

This package is designed to work seamlessly with the `@dangao/bun-server`
framework. The framework provides higher-level abstractions through
`ConfigCenterModule` and `ServiceRegistryModule`.

### Installation

```bash
bun add @dangao/bun-server
```

> Note: `@dangao/nacos-client` is included as a dependency of
> `@dangao/bun-server`, no need to install separately.

### Using ConfigCenterModule

```typescript
import {
  Application,
  CONFIG_CENTER_TOKEN,
  type ConfigCenter,
  ConfigCenterModule,
  Controller,
  GET,
  Inject,
  Injectable,
  Module,
} from "@dangao/bun-server";

@Injectable()
class AppService {
  public constructor(
    @Inject(CONFIG_CENTER_TOKEN) private readonly configCenter: ConfigCenter,
  ) {}

  public async getAppConfig(): Promise<string> {
    const config = await this.configCenter.getConfig(
      "app-config",
      "DEFAULT_GROUP",
    );
    return config.content;
  }

  public watchConfig(): void {
    // Watch for config changes
    this.configCenter.watchConfig("app-config", "DEFAULT_GROUP", (result) => {
      console.log("Config changed:", result.content);
    });
  }
}

@Controller("/api")
class AppController {
  public constructor(private readonly appService: AppService) {}

  @GET("/config")
  public async getConfig() {
    return { config: await this.appService.getAppConfig() };
  }
}

@Module({
  imports: [
    ConfigCenterModule.forRoot({
      provider: "nacos",
      nacos: {
        client: {
          serverList: ["http://localhost:8848"],
          namespaceId: "public",
          username: "nacos",
          password: "nacos",
        },
        watchInterval: 5000, // Config watch interval (ms)
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
class AppModule {}

const app = new Application();
app.registerModule(AppModule);
app.listen(3000);
```

### Using ServiceRegistryModule

```typescript
import {
  Application,
  Controller,
  GET,
  Inject,
  Injectable,
  Module,
  POST,
  SERVICE_REGISTRY_TOKEN,
  type ServiceInstance,
  type ServiceRegistry,
  ServiceRegistryModule,
} from "@dangao/bun-server";

@Injectable()
class DiscoveryService {
  public constructor(
    @Inject(SERVICE_REGISTRY_TOKEN) private readonly serviceRegistry:
      ServiceRegistry,
  ) {}

  public async registerSelf(): Promise<void> {
    const instance: ServiceInstance = {
      serviceName: "my-service",
      ip: "127.0.0.1",
      port: 3000,
      weight: 1,
      healthy: true,
      enabled: true,
      metadata: { version: "1.0.0" },
    };
    await this.serviceRegistry.register(instance);
  }

  public async discoverService(
    serviceName: string,
  ): Promise<ServiceInstance[]> {
    return await this.serviceRegistry.getInstances(serviceName);
  }

  public watchService(serviceName: string): void {
    this.serviceRegistry.watchInstances(serviceName, (instances) => {
      console.log(`Service ${serviceName} instances:`, instances);
    });
  }
}

@Controller("/api")
class DiscoveryController {
  public constructor(private readonly discoveryService: DiscoveryService) {}

  @POST("/register")
  public async register() {
    await this.discoveryService.registerSelf();
    return { message: "Service registered" };
  }

  @GET("/services/:name")
  public async getServices(@Param("name") name: string) {
    return await this.discoveryService.discoverService(name);
  }
}

@Module({
  imports: [
    ServiceRegistryModule.forRoot({
      provider: "nacos",
      nacos: {
        client: {
          serverList: ["http://localhost:8848"],
          namespaceId: "public",
          username: "nacos",
          password: "nacos",
        },
        watchInterval: 5000, // Instance watch interval (ms)
        heartbeatInterval: 5000, // Heartbeat interval (ms)
      },
    }),
  ],
  controllers: [DiscoveryController],
  providers: [DiscoveryService],
})
class AppModule {}

const app = new Application();
app.registerModule(AppModule);
app.listen(3000);
```

### Using ServiceClient for Inter-Service Communication

```typescript
import {
  Inject,
  Injectable,
  RequestLogInterceptor,
  ResponseLogInterceptor,
  SERVICE_REGISTRY_TOKEN,
  ServiceClient,
  type ServiceRegistry,
  TraceIdRequestInterceptor,
} from "@dangao/bun-server";

@Injectable()
class UserService {
  private readonly serviceClient: ServiceClient;

  public constructor(
    @Inject(SERVICE_REGISTRY_TOKEN) serviceRegistry: ServiceRegistry,
  ) {
    this.serviceClient = new ServiceClient(serviceRegistry);

    // Add interceptors
    this.serviceClient.addRequestInterceptor(new TraceIdRequestInterceptor());
    this.serviceClient.addRequestInterceptor(new RequestLogInterceptor());
    this.serviceClient.addResponseInterceptor(new ResponseLogInterceptor());
  }

  public async getUser(id: string): Promise<unknown> {
    const response = await this.serviceClient.call({
      serviceName: "user-service",
      method: "GET",
      path: `/api/users/${id}`,
      loadBalanceStrategy: "roundRobin",
      timeout: 5000,
      // Circuit breaker support
      enableCircuitBreaker: true,
      fallback: () => ({ id, name: "Fallback User" }),
    });
    return response.data;
  }

  public async createUser(data: unknown): Promise<unknown> {
    const response = await this.serviceClient.call({
      serviceName: "user-service",
      method: "POST",
      path: "/api/users",
      body: data,
      loadBalanceStrategy: "weightedRoundRobin",
      // Rate limiting support
      enableRateLimit: true,
      rateLimitKey: "user-service-create",
    });
    return response.data;
  }
}
```

### Load Balancing Strategies

The framework supports multiple load balancing strategies:

- `random` - Random selection
- `roundRobin` - Round-robin selection
- `weightedRoundRobin` - Weighted round-robin based on instance weights
- `consistentHash` - Consistent hashing (requires `consistentHashKey`)
- `leastActive` - Least active connections

### Service Governance Features

```typescript
// Configure circuit breaker
serviceClient.setDefaultCircuitBreakerOptions({
  failureThreshold: 0.5, // 50% failure rate triggers circuit open
  timeWindow: 60000, // Time window for failure calculation (ms)
  minimumRequests: 10, // Minimum requests before circuit can open
  openDuration: 60000, // Duration circuit stays open (ms)
  halfOpenRequests: 3, // Requests allowed in half-open state
});

// Configure rate limiter
serviceClient.setDefaultRateLimiterOptions({
  requestsPerSecond: 100,
  timeWindow: 1000,
});

// Configure retry strategy
serviceClient.setDefaultRetryStrategy({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  baseDelay: 1000,
  maxDelay: 30000,
});
```

## Nacos Compatibility

This client is designed for **Nacos 3.X** and uses the following Open API
endpoints:

- Configuration: `GET /nacos/v3/client/cs/config`
- Service Registration: `POST /nacos/v3/client/ns/instance`
- Service Deregistration: `DELETE /nacos/v3/client/ns/instance`
- Service Discovery: `GET /nacos/v3/client/ns/instance/list`

## Related Documentation

- [Bun Server Framework Documentation](https://github.com/dangaogit/bun-server)
- [Nacos Official Documentation](https://nacos.io/docs/latest/)
- [Nacos 3.X Open API](https://nacos.io/docs/latest/manual/user/open-api/)

## License

MIT
