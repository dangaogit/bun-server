# 服务注册与发现使用指南

本文档介绍如何使用 Bun Server Framework 的服务注册与发现功能。

## 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [服务注册](#服务注册)
- [服务发现](#服务发现)
- [负载均衡](#负载均衡)
- [健康检查集成](#健康检查集成)
- [最佳实践](#最佳实践)

## 概述

服务注册与发现提供了微服务架构中的核心能力：

- **服务注册**：将服务实例注册到注册中心
- **服务发现**：从注册中心发现服务实例
- **负载均衡**：支持多种负载均衡策略
- **健康检查**：自动根据健康检查状态更新服务健康状态
- **实例监听**：监听服务实例变更

## 快速开始

### 1. 注册服务注册中心模块

```typescript
import { Application } from '@dangao/bun-server';
import { ServiceRegistryModule } from '@dangao/bun-server';

const app = new Application();

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
// 服务会自动注册到注册中心
```

## 服务注册

### 使用装饰器自动注册

最简单的方式是使用 `@ServiceRegistry` 装饰器：

```typescript
@ServiceRegistry('user-service', {
  port: 3000,
  weight: 100,
  enabled: true,
  healthy: true,
  metadata: {
    version: '1.0.0',
    region: 'us-east',
  },
  clusterName: 'default',
  namespaceId: 'public',
  groupName: 'DEFAULT_GROUP',
})
@Controller('/api/users')
class UserController {
  // ...
}
```

**配置说明**：
- `serviceName`：服务名（必需）
- `port`：服务端口（可选，默认从 Application 获取）
- `ip`：服务 IP（可选，默认从 Application 获取）
- `weight`：服务权重（用于加权负载均衡）
- `enabled`：是否启用
- `healthy`：初始健康状态
- `metadata`：服务元数据（版本、区域等）
- `clusterName`：集群名
- `namespaceId`：命名空间
- `groupName`：分组名

### 手动注册

```typescript
import {
  SERVICE_REGISTRY_TOKEN,
  type ServiceRegistry,
  type ServiceInstance,
} from '@dangao/bun-server';
import { Inject, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  public constructor(
    @Inject(SERVICE_REGISTRY_TOKEN) private readonly registry: ServiceRegistry,
  ) {}

  public async registerService() {
    const instance: ServiceInstance = {
      serviceName: 'my-service',
      ip: '127.0.0.1',
      port: 3000,
      weight: 100,
      healthy: true,
      enabled: true,
      metadata: {
        version: '1.0.0',
      },
    };

    await this.registry.register(instance);
  }

  public async renewService() {
    // 续约服务（心跳）
    await this.registry.renew({
      serviceName: 'my-service',
      ip: '127.0.0.1',
      port: 3000,
    });
  }

  public async deregisterService() {
    // 注销服务
    await this.registry.deregister({
      serviceName: 'my-service',
      ip: '127.0.0.1',
      port: 3000,
    });
  }
}
```

## 服务发现

### 使用装饰器自动发现

使用 `@ServiceDiscovery` 装饰器自动注入服务实例列表：

```typescript
import { ServiceDiscovery, Injectable } from '@dangao/bun-server';
import type { ServiceInstance } from '@dangao/bun-server';

@Injectable()
class MyService {
  @ServiceDiscovery('user-service', {
    healthyOnly: true, // 只获取健康实例
    namespaceId: 'public',
    groupName: 'DEFAULT_GROUP',
  })
  public instances: ServiceInstance[] = [];

  public async getAvailableInstances() {
    // instances 会自动更新
    return this.instances;
  }
}
```

### 手动发现

```typescript
// 获取服务实例列表
const instances = await serviceRegistry.getInstances('user-service', {
  healthyOnly: true,
  namespaceId: 'public',
  groupName: 'DEFAULT_GROUP',
  clusterName: 'default',
});

// 监听服务实例变更
const unsubscribe = serviceRegistry.watchInstances(
  'user-service',
  (newInstances) => {
    console.log('Instances updated:', newInstances);
    // 更新本地缓存
    updateLocalCache(newInstances);
  },
  {
    namespaceId: 'public',
    groupName: 'DEFAULT_GROUP',
  },
);

// 取消监听
unsubscribe();
```

## 负载均衡

ServiceClient 支持多种负载均衡策略，详见[服务调用文档](./microservice.md#负载均衡)。

## 健康检查集成

服务注册会自动集成健康检查模块，根据健康检查状态更新服务健康状态：

### 1. 注册健康检查模块

```typescript
import { HealthModule } from '@dangao/bun-server';

HealthModule.forRoot({
  indicators: [
    {
      name: 'db',
      async check() {
        // 检查数据库连接
        const isHealthy = await checkDatabase();
        return {
          status: isHealthy ? 'up' : 'down',
          details: { connection: isHealthy ? 'ok' : 'failed' },
        };
      },
    },
    {
      name: 'cache',
      async check() {
        // 检查缓存连接
        return { status: 'up' };
      },
    },
  ],
});
```

### 2. 使用 @ServiceRegistry 装饰器

使用 `@ServiceRegistry` 装饰器的服务会自动根据健康检查状态更新：

```typescript
@ServiceRegistry('user-service')
@Controller('/api/users')
class UserController {
  // 服务会根据健康检查状态自动更新健康状态
}
```

### 3. 健康检查更新机制

- 每 30 秒检查一次健康状态
- 如果健康检查失败，服务会被标记为不健康
- 不健康的服务实例不会被负载均衡器选择（如果设置了 `healthyOnly: true`）

## 最佳实践

### 1. 服务注册

- **使用装饰器**：优先使用 `@ServiceRegistry` 装饰器自动注册
- **配置元数据**：设置版本、区域等元数据便于管理
- **合理权重**：根据服务实例性能设置权重
- **自动注销**：确保应用关闭时正确注销服务

### 2. 服务发现

- **健康过滤**：使用 `healthyOnly: true` 只获取健康实例
- **实例监听**：监听实例变更及时更新本地缓存
- **命名空间**：使用命名空间区分不同环境

### 3. 负载均衡

- **随机**：适用于无状态服务
- **轮询**：适用于性能相近的实例
- **加权轮询**：适用于性能差异较大的实例
- **一致性哈希**：适用于需要会话粘性的场景
- **最少连接**：适用于长连接场景

### 4. 健康检查

- **关键依赖**：为关键依赖（数据库、缓存等）添加健康检查
- **检查频率**：合理设置检查频率（默认 30 秒）
- **快速失败**：健康检查应该快速失败，避免阻塞

## 示例

完整示例请参考 `examples/microservice-app.ts`。

