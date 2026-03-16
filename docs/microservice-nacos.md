# Nacos Integration Documentation

This document introduces how to use Nacos as a configuration center and service registry in Bun Server Framework.

## Table of Contents

- [Overview](#overview)
- [Nacos Installation](#nacos-installation)
- [Configuration Center Integration](#configuration-center-integration)
- [Service Registry Integration](#service-registry-integration)
- [Complete Example](#complete-example)
- [Common Issues](#common-issues)

## Overview

Bun Server Framework provides Nacos 3.X support through the `@dangao/nacos-client` package, including:

- **Configuration Management**: Dynamic configuration fetching and watching
- **Service Registration**: Service instance registration, renewal, and deregistration
- **Service Discovery**: Service instance querying and watching
- **Open API**: Based on Nacos 3.X Open API implementation

## Nacos Installation

### Docker Installation (Recommended)

```bash
docker run --name nacos -e MODE=standalone -p 8848:8848 nacos/nacos-server:v3.0.0
```

### Access Console

Visit http://localhost:8848/nacos, default username/password: `nacos/nacos`

## Configuration Center Integration

### 1. Register Configuration Center Module

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
      watchInterval: 3000, // Configuration polling interval (milliseconds)
    },
  }),
);
```

### 2. Create Configuration in Nacos Console

1. Log in to Nacos console
2. Go to "Configuration Management" -> "Configuration List"
3. Click "+" to create configuration:
   - **Data ID**: `my-config`
   - **Group**: `DEFAULT_GROUP`
   - **Configuration Format**: `JSON` (or other formats)
   - **Configuration Content**:
     ```json
     {
       "app": {
         "name": "MyApp",
         "version": "1.0.0"
       }
     }
     ```

### 3. Use Configuration

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

### 4. Hot Configuration Update

```typescript
configCenter.watchConfig('my-config', 'DEFAULT_GROUP', (newConfig) => {
  console.log('Config updated:', newConfig.content);
  // Update application configuration
});
```

## Service Registry Integration

### 1. Register Service Registry Module

```typescript
import { ServiceRegistryModule } from '@dangao/bun-server';

app.registerModule(
  ServiceRegistryModule.forRoot({
    provider: 'nacos',
    autoRegister: true, // set false to disable listen-time auto registration
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

#### Using Decorator (Recommended)

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
// Service will be automatically registered to Nacos
```

#### Manual Registration

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

### 3. Service Discovery

```typescript
import {
  SERVICE_REGISTRY_TOKEN,
  type ServiceRegistry,
} from '@dangao/bun-server';

const instances = await serviceRegistry.getInstances('user-service', {
  healthyOnly: true,
  namespaceId: 'public',
});

// Watch for service instance changes
serviceRegistry.watchInstances('user-service', (newInstances) => {
  console.log('Instances updated:', newInstances);
});
```

## Complete Example

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

// Register configuration center
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

// Register service registry
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

// Service class
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

// Controller
@ServiceRegistry('user-service', { port: 3000 })
@Controller('/api/users')
class UserController {
  public constructor(private readonly userService: UserService) {}

  @GET('/')
  public async getUsers() {
    return { users: [] };
  }
}

// Start application
const app = new Application();
app.registerController(UserController);
await app.listen(3000);
```

## Common Issues

### 1. Connection Failure

**Issue**: Unable to connect to Nacos server

**Solutions**:
- Check if Nacos server is running
- Check if `serverList` configuration is correct
- Check network connection and firewall settings
- Check if username and password are correct

### 2. Configuration Fetch Failure

**Issue**: Unable to fetch configuration

**Solutions**:
- Check if configuration exists in Nacos console
- Check if Data ID and Group are correct
- Check if namespace is correct
- Check permission settings

### 3. Service Registration Failure

**Issue**: Service cannot be registered to Nacos

**Solutions**:
- Check if service registry module is registered
- Check if service name, IP, and port are correct
- Check if Nacos server connection is normal
- Check application logs for detailed error information

### 4. Service Discovery Returns Empty

**Issue**: Service discovery returns empty list

**Solutions**:
- Check if service is registered
- Check `healthyOnly` option (if set to true, only healthy instances are returned)
- Check if namespace and group are correct
- Check if service instances are healthy

### 5. Hot Configuration Update Not Working

**Issue**: Application not updated after configuration changes

**Solutions**:
- Check if configuration watching is enabled (`watch: true`)
- Check if `watchInterval` setting is reasonable
- Check if configuration watch callback is correctly implemented
- Check logs to confirm if configuration changes are detected

## Reference Resources

- [Nacos Official Documentation](https://nacos.io/docs/latest/)
- [Nacos 3.X Open API](https://nacos.io/docs/latest/manual/user/open-api/)
- [Microservice Usage Guide](./microservice.md)
- [Configuration Center Usage Guide](./microservice-config-center.md)
- [Service Registration and Discovery Usage Guide](./microservice-service-registry.md)
