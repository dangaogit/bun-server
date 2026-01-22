# Nacos 集成文档

本文档介绍如何在 Bun Server Framework 中使用 Nacos 作为配置中心和服务注册中心。

## 目录

- [概述](#概述)
- [Nacos 安装](#nacos-安装)
- [配置中心集成](#配置中心集成)
- [服务注册中心集成](#服务注册中心集成)
- [完整示例](#完整示例)
- [常见问题](#常见问题)

## 概述

Bun Server Framework 通过 `@dangao/nacos-client` 包提供 Nacos 3.X 支持，包括：

- **配置管理**：动态配置获取和监听
- **服务注册**：服务实例注册、续约、注销
- **服务发现**：服务实例查询和监听
- **Open API**：基于 Nacos 3.X Open API 实现

## Nacos 安装

### Docker 安装（推荐）

```bash
docker run --name nacos -e MODE=standalone -p 8848:8848 nacos/nacos-server:v3.0.0
```

### 访问控制台

访问 http://localhost:8848/nacos，默认用户名/密码：`nacos/nacos`

## 配置中心集成

### 1. 注册配置中心模块

```typescript
import { Application } from '@dangao/bun-server';
import { ConfigCenterModule } from '@dangao/bun-server';

const app = new Application();

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
      watchInterval: 3000, // 配置轮询间隔（毫秒）
    },
  }),
);
```

### 2. 在 Nacos 控制台创建配置

1. 登录 Nacos 控制台
2. 进入"配置管理" -> "配置列表"
3. 点击"+"创建配置：
   - **Data ID**：`my-config`
   - **Group**：`DEFAULT_GROUP`
   - **配置格式**：`JSON`（或其他格式）
   - **配置内容**：
     ```json
     {
       "app": {
         "name": "MyApp",
         "version": "1.0.0"
       }
     }
     ```

### 3. 使用配置

```typescript
import {
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
    const result = await this.configCenter.getConfig(
      'my-config',
      'DEFAULT_GROUP',
    );
    const config = JSON.parse(result.content);
    return config.app.name;
  }
}
```

### 4. 配置热更新

```typescript
configCenter.watchConfig('my-config', 'DEFAULT_GROUP', (newConfig) => {
  console.log('Config updated:', newConfig.content);
  // 更新应用配置
});
```

## 服务注册中心集成

### 1. 注册服务注册中心模块

```typescript
import { ServiceRegistryModule } from '@dangao/bun-server';

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
      heartbeatInterval: 5000, // 心跳间隔（毫秒）
    },
  }),
);
```

### 2. 注册服务

#### 使用装饰器（推荐）

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

app.registerController(UserController);
await app.listen(3000);
// 服务会自动注册到 Nacos
```

#### 手动注册

```typescript
import {
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
      serviceName: 'user-service',
      ip: '127.0.0.1',
      port: 3000,
      weight: 100,
      healthy: true,
    });
  }
}
```

### 3. 服务发现

```typescript
import {
  SERVICE_REGISTRY_TOKEN,
  type ServiceRegistry,
} from '@dangao/bun-server';

const instances = await serviceRegistry.getInstances('user-service', {
  healthyOnly: true,
  namespaceId: 'public',
});

// 监听服务实例变更
serviceRegistry.watchInstances('user-service', (newInstances) => {
  console.log('Instances updated:', newInstances);
});
```

## 完整示例

```typescript
import { Application, Controller, GET, Injectable, Inject } from '@dangao/bun-server';
import {
  ConfigCenterModule,
  ServiceRegistryModule,
  ServiceClient,
  CONFIG_CENTER_TOKEN,
  SERVICE_REGISTRY_TOKEN,
  type ConfigCenter,
  type ServiceRegistry,
} from '@dangao/bun-server';

// 注册配置中心
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
});

// 注册服务注册中心
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
});

// 服务类
@Injectable()
class UserService {
  private readonly serviceClient: ServiceClient;

  public constructor(
    @Inject(CONFIG_CENTER_TOKEN) private readonly configCenter: ConfigCenter,
    @Inject(SERVICE_REGISTRY_TOKEN) private readonly serviceRegistry: ServiceRegistry,
  ) {
    this.serviceClient = new ServiceClient(this.serviceRegistry);
  }

  public async callOrderService() {
    return await this.serviceClient.call({
      serviceName: 'order-service',
      method: 'GET',
      path: '/api/orders',
    });
  }
}

// 控制器
@ServiceRegistry('user-service', { port: 3000 })
@Controller('/api/users')
class UserController {
  public constructor(private readonly userService: UserService) {}

  @GET('/')
  public async getUsers() {
    return { users: [] };
  }
}

// 启动应用
const app = new Application();
app.registerController(UserController);
await app.listen(3000);
```

## 常见问题

### 1. 连接失败

**问题**：无法连接到 Nacos 服务器

**解决方案**：
- 检查 Nacos 服务器是否运行
- 检查 `serverList` 配置是否正确
- 检查网络连接和防火墙设置
- 检查用户名和密码是否正确

### 2. 配置获取失败

**问题**：无法获取配置

**解决方案**：
- 检查配置是否在 Nacos 控制台中存在
- 检查 Data ID 和 Group 是否正确
- 检查命名空间是否正确
- 检查权限设置

### 3. 服务注册失败

**问题**：服务无法注册到 Nacos

**解决方案**：
- 检查服务注册中心模块是否已注册
- 检查服务名、IP、端口是否正确
- 检查 Nacos 服务器连接是否正常
- 查看应用日志获取详细错误信息

### 4. 服务发现为空

**问题**：服务发现返回空列表

**解决方案**：
- 检查服务是否已注册
- 检查 `healthyOnly` 选项（如果设置为 true，只返回健康实例）
- 检查命名空间和分组是否正确
- 检查服务实例是否健康

### 5. 配置热更新不生效

**问题**：配置变更后应用未更新

**解决方案**：
- 检查是否启用了配置监听（`watch: true`）
- 检查 `watchInterval` 设置是否合理
- 检查配置监听回调是否正确实现
- 查看日志确认配置变更是否被检测到

## 参考资源

- [Nacos 官方文档](https://nacos.io/docs/latest/)
- [Nacos 3.X Open API](https://nacos.io/docs/latest/manual/user/open-api/)
- [微服务使用指南](./microservice.md)
- [配置中心使用指南](./microservice-config-center.md)
- [服务注册与发现使用指南](./microservice-service-registry.md)

