# @dangao/nacos-client

基于 Bun 运行时的轻量级 Nacos 3.X Open API 客户端，支持配置管理和服务发现。

## 特性

- **配置管理** - 从 Nacos 配置中心获取配置
- **服务发现** - 注册、注销和查询服务实例
- **高可用** - 自动服务器故障转移和重试机制
- **TypeScript 原生** - 完整的 TypeScript 支持和类型定义
- **Bun 优化** - 专为 Bun 运行时设计

## 安装

```bash
bun add @dangao/nacos-client
```

## 快速开始

### 配置管理

```typescript
import { NacosClient, NacosConfigClient } from '@dangao/nacos-client';

// 创建客户端
const client = new NacosClient({
  serverList: ['http://localhost:8848'],
  namespaceId: 'public',
  username: 'nacos',
  password: 'nacos',
});

const configClient = new NacosConfigClient(client);

// 获取配置
const config = await configClient.getConfig({
  dataId: 'application.yaml',
  groupName: 'DEFAULT_GROUP',
});

console.log(config.content);     // 配置内容
console.log(config.md5);         // 配置 MD5 值
console.log(config.contentType); // 内容类型
```

### 服务发现

```typescript
import { NacosClient, NacosServiceClient } from '@dangao/nacos-client';

const client = new NacosClient({
  serverList: ['http://localhost:8848'],
  namespaceId: 'public',
});

const serviceClient = new NacosServiceClient(client);

// 注册服务实例
await serviceClient.registerInstance({
  serviceName: 'my-service',
  ip: '192.168.1.100',
  port: 8080,
  weight: 1,
  enabled: true,
  metadata: {
    version: '1.0.0',
    env: 'production',
  },
});

// 查询服务实例
const instances = await serviceClient.getInstances({
  serviceName: 'my-service',
  healthyOnly: true,
});

console.log(instances);

// 注销服务实例
await serviceClient.deregisterInstance('my-service', '192.168.1.100', 8080);
```

## API 参考

### NacosClient

基础 HTTP 客户端，负责与 Nacos 服务器通信。

#### 构造函数选项

| 选项 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `serverList` | `string[]` | 是 | - | Nacos 服务器地址列表 |
| `namespaceId` | `string` | 否 | - | 命名空间 ID |
| `username` | `string` | 否 | - | 认证用户名 |
| `password` | `string` | 否 | - | 认证密码 |
| `timeout` | `number` | 否 | `5000` | 请求超时时间（毫秒） |
| `retryCount` | `number` | 否 | `3` | 重试次数 |
| `retryDelay` | `number` | 否 | `1000` | 重试间隔（毫秒） |

### NacosConfigClient

配置管理客户端。

#### 方法

##### `getConfig(options: GetConfigOptions): Promise<ConfigResult>`

从 Nacos 配置中心获取配置。

**参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `dataId` | `string` | 是 | 配置 ID |
| `groupName` | `string` | 是 | 配置分组 |
| `namespaceId` | `string` | 否 | 命名空间 ID（覆盖客户端设置） |

**返回值：** `ConfigResult`

| 字段 | 类型 | 说明 |
|------|------|------|
| `content` | `string` | 配置内容 |
| `md5` | `string` | 内容 MD5 值 |
| `lastModified` | `number` | 最后修改时间戳 |
| `contentType` | `string` | 内容类型 |

### NacosServiceClient

服务注册与发现客户端。

#### 方法

##### `registerInstance(options: RegisterInstanceOptions): Promise<void>`

注册服务实例。

**参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `serviceName` | `string` | 是 | 服务名 |
| `ip` | `string` | 是 | 实例 IP 地址 |
| `port` | `number` | 是 | 实例端口 |
| `weight` | `number` | 否 | 实例权重 |
| `enabled` | `boolean` | 否 | 是否启用 |
| `metadata` | `Record<string, string>` | 否 | 实例元数据 |
| `clusterName` | `string` | 否 | 集群名称 |
| `namespaceId` | `string` | 否 | 命名空间 ID |
| `groupName` | `string` | 否 | 分组名称 |
| `heartBeat` | `boolean` | 否 | 是否为心跳请求 |

##### `deregisterInstance(serviceName, ip, port, options?): Promise<void>`

注销服务实例。

**参数：**

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `serviceName` | `string` | 是 | 服务名 |
| `ip` | `string` | 是 | 实例 IP 地址 |
| `port` | `number` | 是 | 实例端口 |
| `options.namespaceId` | `string` | 否 | 命名空间 ID |
| `options.groupName` | `string` | 否 | 分组名称 |
| `options.clusterName` | `string` | 否 | 集群名称 |

##### `getInstances(options: GetInstancesOptions): Promise<ServiceInstance[]>`

查询服务实例列表。

**参数：**

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `serviceName` | `string` | 是 | 服务名 |
| `namespaceId` | `string` | 否 | 命名空间 ID |
| `groupName` | `string` | 否 | 分组名称 |
| `clusterName` | `string` | 否 | 集群名称 |
| `healthyOnly` | `boolean` | 否 | 是否只返回健康实例 |

**返回值：** `ServiceInstance[]`

| 字段 | 类型 | 说明 |
|------|------|------|
| `serviceName` | `string` | 服务名 |
| `ip` | `string` | 实例 IP |
| `port` | `number` | 实例端口 |
| `weight` | `number` | 实例权重 |
| `healthy` | `boolean` | 健康状态 |
| `enabled` | `boolean` | 启用状态 |
| `metadata` | `Record<string, string>` | 实例元数据 |
| `clusterName` | `string` | 集群名称 |
| `namespaceId` | `string` | 命名空间 ID |
| `groupName` | `string` | 分组名称 |

## 错误处理

客户端会抛出 `NacosClientError` 异常：

```typescript
import { NacosClientError } from '@dangao/nacos-client';

try {
  const config = await configClient.getConfig({
    dataId: 'non-existent',
    groupName: 'DEFAULT_GROUP',
  });
} catch (error) {
  if (error instanceof NacosClientError) {
    console.error('Nacos 错误:', error.message);
    console.error('原因:', error.cause);
  }
}
```

## 高可用配置

客户端支持配置多个 Nacos 服务器以实现高可用：

```typescript
const client = new NacosClient({
  serverList: [
    'http://nacos1:8848',
    'http://nacos2:8848',
    'http://nacos3:8848',
  ],
  retryCount: 3,
  retryDelay: 1000,
});
```

当某个服务器不可用时，客户端会自动切换到列表中的下一个服务器并重试请求。

## 与 @dangao/bun-server 集成

本包设计为与 `@dangao/bun-server` 框架无缝配合使用。框架通过 `ConfigCenterModule` 和 `ServiceRegistryModule` 提供更高级的抽象。

### 安装

```bash
bun add @dangao/bun-server
```

> 注意：`@dangao/nacos-client` 已作为 `@dangao/bun-server` 的依赖包含，无需单独安装。

### 使用 ConfigCenterModule（配置中心）

```typescript
import {
  Application,
  Module,
  Controller,
  GET,
  Inject,
  Injectable,
  ConfigCenterModule,
  CONFIG_CENTER_TOKEN,
  type ConfigCenter,
} from '@dangao/bun-server';

@Injectable()
class AppService {
  public constructor(
    @Inject(CONFIG_CENTER_TOKEN) private readonly configCenter: ConfigCenter,
  ) {}

  public async getAppConfig(): Promise<string> {
    const config = await this.configCenter.getConfig('app-config', 'DEFAULT_GROUP');
    return config.content;
  }

  public watchConfig(): void {
    // 监听配置变更
    this.configCenter.watchConfig('app-config', 'DEFAULT_GROUP', (result) => {
      console.log('配置已变更:', result.content);
    });
  }
}

@Controller('/api')
class AppController {
  public constructor(private readonly appService: AppService) {}

  @GET('/config')
  public async getConfig() {
    return { config: await this.appService.getAppConfig() };
  }
}

@Module({
  imports: [
    ConfigCenterModule.forRoot({
      provider: 'nacos',
      nacos: {
        client: {
          serverList: ['http://localhost:8848'],
          namespaceId: 'public',
          username: 'nacos',
          password: 'nacos',
        },
        watchInterval: 5000, // 配置监听间隔（毫秒）
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

### 使用 ServiceRegistryModule（服务注册中心）

```typescript
import {
  Application,
  Module,
  Controller,
  GET,
  POST,
  Inject,
  Injectable,
  ServiceRegistryModule,
  SERVICE_REGISTRY_TOKEN,
  type ServiceRegistry,
  type ServiceInstance,
} from '@dangao/bun-server';

@Injectable()
class DiscoveryService {
  public constructor(
    @Inject(SERVICE_REGISTRY_TOKEN) private readonly serviceRegistry: ServiceRegistry,
  ) {}

  public async registerSelf(): Promise<void> {
    const instance: ServiceInstance = {
      serviceName: 'my-service',
      ip: '127.0.0.1',
      port: 3000,
      weight: 1,
      healthy: true,
      enabled: true,
      metadata: { version: '1.0.0' },
    };
    await this.serviceRegistry.register(instance);
  }

  public async discoverService(serviceName: string): Promise<ServiceInstance[]> {
    return await this.serviceRegistry.getInstances(serviceName);
  }

  public watchService(serviceName: string): void {
    this.serviceRegistry.watchInstances(serviceName, (instances) => {
      console.log(`服务 ${serviceName} 实例列表:`, instances);
    });
  }
}

@Controller('/api')
class DiscoveryController {
  public constructor(private readonly discoveryService: DiscoveryService) {}

  @POST('/register')
  public async register() {
    await this.discoveryService.registerSelf();
    return { message: '服务已注册' };
  }

  @GET('/services/:name')
  public async getServices(@Param('name') name: string) {
    return await this.discoveryService.discoverService(name);
  }
}

@Module({
  imports: [
    ServiceRegistryModule.forRoot({
      provider: 'nacos',
      nacos: {
        client: {
          serverList: ['http://localhost:8848'],
          namespaceId: 'public',
          username: 'nacos',
          password: 'nacos',
        },
        watchInterval: 5000,    // 实例监听间隔（毫秒）
        heartbeatInterval: 5000, // 心跳间隔（毫秒）
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

### 使用 ServiceClient 进行服务间调用

```typescript
import {
  Inject,
  Injectable,
  SERVICE_REGISTRY_TOKEN,
  ServiceClient,
  TraceIdRequestInterceptor,
  RequestLogInterceptor,
  ResponseLogInterceptor,
  type ServiceRegistry,
} from '@dangao/bun-server';

@Injectable()
class UserService {
  private readonly serviceClient: ServiceClient;

  public constructor(
    @Inject(SERVICE_REGISTRY_TOKEN) serviceRegistry: ServiceRegistry,
  ) {
    this.serviceClient = new ServiceClient(serviceRegistry);

    // 添加拦截器
    this.serviceClient.addRequestInterceptor(new TraceIdRequestInterceptor());
    this.serviceClient.addRequestInterceptor(new RequestLogInterceptor());
    this.serviceClient.addResponseInterceptor(new ResponseLogInterceptor());
  }

  public async getUser(id: string): Promise<unknown> {
    const response = await this.serviceClient.call({
      serviceName: 'user-service',
      method: 'GET',
      path: `/api/users/${id}`,
      loadBalanceStrategy: 'roundRobin',
      timeout: 5000,
      // 熔断器支持
      enableCircuitBreaker: true,
      fallback: () => ({ id, name: '降级用户' }),
    });
    return response.data;
  }

  public async createUser(data: unknown): Promise<unknown> {
    const response = await this.serviceClient.call({
      serviceName: 'user-service',
      method: 'POST',
      path: '/api/users',
      body: data,
      loadBalanceStrategy: 'weightedRoundRobin',
      // 限流支持
      enableRateLimit: true,
      rateLimitKey: 'user-service-create',
    });
    return response.data;
  }
}
```

### 负载均衡策略

框架支持多种负载均衡策略：

- `random` - 随机选择
- `roundRobin` - 轮询选择
- `weightedRoundRobin` - 基于实例权重的加权轮询
- `consistentHash` - 一致性哈希（需要提供 `consistentHashKey`）
- `leastActive` - 最小活跃连接数

### 服务治理功能

```typescript
// 配置熔断器
serviceClient.setDefaultCircuitBreakerOptions({
  failureThreshold: 0.5,    // 50% 失败率触发熔断
  timeWindow: 60000,        // 失败率计算时间窗口（毫秒）
  minimumRequests: 10,      // 熔断器开启前的最小请求数
  openDuration: 60000,      // 熔断器打开持续时间（毫秒）
  halfOpenRequests: 3,      // 半开状态允许的请求数
});

// 配置限流器
serviceClient.setDefaultRateLimiterOptions({
  requestsPerSecond: 100,
  timeWindow: 1000,
});

// 配置重试策略
serviceClient.setDefaultRetryStrategy({
  maxRetries: 3,
  retryDelay: 1000,
  exponentialBackoff: true,
  baseDelay: 1000,
  maxDelay: 30000,
});
```

## Nacos 版本兼容性

此客户端专为 **Nacos 3.X** 设计，使用以下 Open API 端点：

- 配置获取：`GET /nacos/v3/client/cs/config`
- 服务注册：`POST /nacos/v3/client/ns/instance`
- 服务注销：`DELETE /nacos/v3/client/ns/instance`
- 服务发现：`GET /nacos/v3/client/ns/instance/list`

## 相关文档

- [Bun Server Framework 文档](https://github.com/dangaogit/bun-server)
- [Nacos 官方文档](https://nacos.io/docs/latest/)
- [Nacos 3.X Open API](https://nacos.io/docs/latest/manual/user/open-api/)

## 许可证

MIT
