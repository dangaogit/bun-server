# Service Registration and Discovery Usage Guide

This document introduces how to use the service registration and discovery features in Bun Server Framework.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Service Registration](#service-registration)
- [Service Discovery](#service-discovery)
- [Load Balancing](#load-balancing)
- [Health Check Integration](#health-check-integration)
- [Best Practices](#best-practices)

## Overview

Service registration and discovery provides core capabilities in microservice architecture:

- **Service Registration**: Register service instances to the registry
- **Service Discovery**: Discover service instances from the registry
- **Load Balancing**: Supports multiple load balancing strategies
- **Health Check**: Automatically update service health status based on health check results
- **Instance Watching**: Watch for service instance changes

## Quick Start

### 1. Register Service Registry Module

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
      heartbeatInterval: 5000, // Heartbeat interval (milliseconds)
    },
  }),
);
```

### 2. Register Service

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
// Service will be automatically registered to the registry
```

## Service Registration

### Automatic Registration with Decorator

The simplest way is to use the `@ServiceRegistry` decorator:

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

**Configuration Description**:
- `serviceName`: Service name (required)
- `port`: Service port (optional, default from Application)
- `ip`: Service IP (optional, default from Application)
- `weight`: Service weight (for weighted load balancing)
- `enabled`: Whether enabled
- `healthy`: Initial health status
- `metadata`: Service metadata (version, region, etc.)
- `clusterName`: Cluster name
- `namespaceId`: Namespace
- `groupName`: Group name

### Manual Registration

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
    // Renew service (heartbeat)
    await this.registry.renew({
      serviceName: 'my-service',
      ip: '127.0.0.1',
      port: 3000,
    });
  }

  public async deregisterService() {
    // Deregister service
    await this.registry.deregister({
      serviceName: 'my-service',
      ip: '127.0.0.1',
      port: 3000,
    });
  }
}
```

## Service Discovery

### Automatic Discovery with Decorator

Use the `@ServiceDiscovery` decorator to automatically inject service instance lists:

```typescript
import { ServiceDiscovery, Injectable } from '@dangao/bun-server';
import type { ServiceInstance } from '@dangao/bun-server';

@Injectable()
class MyService {
  @ServiceDiscovery('user-service', {
    healthyOnly: true, // Only get healthy instances
    namespaceId: 'public',
    groupName: 'DEFAULT_GROUP',
  })
  public instances: ServiceInstance[] = [];

  public async getAvailableInstances() {
    // instances will be automatically updated
    return this.instances;
  }
}
```

### Manual Discovery

```typescript
// Get service instance list
const instances = await serviceRegistry.getInstances('user-service', {
  healthyOnly: true,
  namespaceId: 'public',
  groupName: 'DEFAULT_GROUP',
  clusterName: 'default',
});

// Watch for service instance changes
const unsubscribe = serviceRegistry.watchInstances(
  'user-service',
  (newInstances) => {
    console.log('Instances updated:', newInstances);
    // Update local cache
    updateLocalCache(newInstances);
  },
  {
    namespaceId: 'public',
    groupName: 'DEFAULT_GROUP',
  },
);

// Unsubscribe
unsubscribe();
```

## Load Balancing

ServiceClient supports multiple load balancing strategies. For details, see [Service Invocation Documentation](./microservice.md#load-balancing).

## Health Check Integration

Service registration automatically integrates with the health check module, updating service health status based on health check results:

### 1. Register Health Check Module

```typescript
import { HealthModule } from '@dangao/bun-server';

HealthModule.forRoot({
  indicators: [
    {
      name: 'db',
      async check() {
        // Check database connection
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
        // Check cache connection
        return { status: 'up' };
      },
    },
  ],
});
```

### 2. Use @ServiceRegistry Decorator

Services using the `@ServiceRegistry` decorator will automatically update based on health check status:

```typescript
@ServiceRegistry('user-service')
@Controller('/api/users')
class UserController {
  // Service will automatically update health status based on health check
}
```

### 3. Health Check Update Mechanism

- Check health status every 30 seconds
- If health check fails, service will be marked as unhealthy
- Unhealthy service instances will not be selected by load balancer (if `healthyOnly: true` is set)

## Best Practices

### 1. Service Registration

- **Use Decorator**: Prefer using `@ServiceRegistry` decorator for automatic registration
- **Configure Metadata**: Set metadata like version, region for easier management
- **Reasonable Weight**: Set weight based on service instance performance
- **Automatic Deregistration**: Ensure services are properly deregistered when application shuts down

### 2. Service Discovery

- **Health Filtering**: Use `healthyOnly: true` to only get healthy instances
- **Instance Watching**: Watch for instance changes and update local cache promptly
- **Namespace**: Use namespaces to distinguish different environments

### 3. Load Balancing

- **Random**: Suitable for stateless services
- **Round-robin**: Suitable for instances with similar performance
- **Weighted Round-robin**: Suitable for instances with significant performance differences
- **Consistent Hashing**: Suitable for scenarios requiring session affinity
- **Least Active**: Suitable for long connection scenarios

### 4. Health Check

- **Critical Dependencies**: Add health checks for critical dependencies (database, cache, etc.)
- **Check Frequency**: Set check frequency reasonably (default 30 seconds)
- **Fast Failure**: Health checks should fail fast to avoid blocking

## Examples

For complete examples, please refer to `examples/microservice-app.ts`.
