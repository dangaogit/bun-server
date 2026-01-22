# Configuration Center Usage Guide

This document introduces how to use the configuration center feature in Bun Server Framework.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Basic Usage](#basic-usage)
- [Hot Configuration Update](#hot-configuration-update)
- [ConfigModule Integration](#configmodule-integration)
- [Decorator Usage](#decorator-usage)
- [Best Practices](#best-practices)

## Overview

The configuration center provides centralized configuration management capabilities, supporting:

- **Dynamic Configuration**: Fetch configurations from the configuration center with hot update support
- **Multi-Environment Support**: Manage configurations for different environments through namespaces and groups
- **Configuration Priority**: Config center > Environment variables > Default configuration
- **Configuration Watching**: Watch for configuration changes and automatically refresh application configuration

## Quick Start

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

### 2. Use Configuration Center

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
    return JSON.parse(result.content);
  }
}
```

## Basic Usage

### Get Configuration

```typescript
// Basic usage
const config = await configCenter.getConfig('my-config', 'DEFAULT_GROUP');

// Specify namespace
const config = await configCenter.getConfig(
  'my-config',
  'DEFAULT_GROUP',
  'production',
);
```

### Configuration Result

`getConfig` returns a `ConfigResult` object:

```typescript
interface ConfigResult {
  content: string;        // Configuration content
  md5: string;           // Configuration MD5 (for change detection)
  lastModified: number;  // Last modified time (timestamp)
  contentType: string;   // Content type
}
```

### Watch Configuration Changes

```typescript
const unsubscribe = configCenter.watchConfig(
  'my-config',
  'DEFAULT_GROUP',
  (newConfig) => {
    console.log('Config updated:', newConfig.content);
    // Update application configuration
    updateAppConfig(JSON.parse(newConfig.content));
  },
);

// Unsubscribe
unsubscribe();
```

## Hot Configuration Update

The configuration center supports hot configuration updates through a polling mechanism to detect configuration changes:

```typescript
ConfigCenterModule.forRoot({
  provider: 'nacos',
  nacos: {
    watchInterval: 3000, // Check for configuration changes every 3 seconds
  },
});

// Watch configuration changes
configCenter.watchConfig('my-config', 'DEFAULT_GROUP', (newConfig) => {
  // Automatically called when configuration changes
  console.log('Config hot updated:', newConfig.content);
});
```

## ConfigModule Integration

ConfigModule supports deep integration with the configuration center, automatically refreshing ConfigService when configurations change:

```typescript
import { ConfigModule } from '@dangao/bun-server';

ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: 'MyApp',
      port: 3000,
    },
  },
  configCenter: {
    enabled: true,
    configs: new Map([
      ['app.name', { dataId: 'app-name', groupName: 'DEFAULT_GROUP' }],
      ['app.port', { dataId: 'app-port', groupName: 'DEFAULT_GROUP' }],
    ]),
    configCenterPriority: true, // Config center has highest priority
  },
});

// Use ConfigService
import { CONFIG_SERVICE_TOKEN, ConfigService } from '@dangao/bun-server';

@Injectable()
class MyService {
  public constructor(
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
  ) {}

  public getAppName() {
    // Automatically fetched from config center, auto-updated on changes
    return this.config.get<string>('app.name');
  }
}
```

### Configuration Priority

- `configCenterPriority: true` (default): Config center > Environment variables > Default configuration
- `configCenterPriority: false`: Default configuration > Environment variables > Config center

## Decorator Usage

### @ConfigCenterValue

Automatically inject configuration values:

```typescript
import { ConfigCenterValue, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  @ConfigCenterValue('app-name', 'DEFAULT_GROUP', {
    defaultValue: 'MyApp',
    watch: true, // Watch for configuration changes
  })
  public appName: string = '';

  public getAppName() {
    return this.appName; // Automatically fetched from config center
  }
}
```

### @NacosValue

Nacos-specific configuration value injection (convenience alias):

```typescript
import { NacosValue, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  @NacosValue('app-name', 'DEFAULT_GROUP', {
    defaultValue: 'MyApp',
  })
  public appName: string = '';
}
```

## Best Practices

### 1. Configuration Organization

- **Namespace**: Used to distinguish different environments (dev, test, prod)
- **Group**: Used for logical grouping (DEFAULT_GROUP, DATABASE_GROUP, etc.)
- **DataId**: Unique identifier for configuration

### 2. Configuration Format

- Recommended to use JSON format for storing configurations
- Supports plain text configurations (such as properties, yaml, etc.)

### 3. Configuration Watching

- Enable watching for critical configurations (`watch: true`)
- Update application state promptly when configurations change
- Avoid frequent configuration changes

### 4. Error Handling

- Use default values when configuration fetch fails
- Log configuration fetch errors
- Implement configuration fallback strategies

### 5. Performance Optimization

- Set `watchInterval` reasonably (recommended 3-10 seconds)
- Use configuration caching to reduce API calls
- Batch fetch configurations (if supported)

## Examples

For complete examples, please refer to `examples/microservice-app.ts`.
