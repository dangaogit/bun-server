# 配置中心使用指南

本文档介绍如何使用 Bun Server Framework 的配置中心功能。

## 目录

- [概述](#概述)
- [快速开始](#快速开始)
- [基本使用](#基本使用)
- [配置热更新](#配置热更新)
- [ConfigModule 集成](#configmodule-集成)
- [装饰器使用](#装饰器使用)
- [最佳实践](#最佳实践)

## 概述

配置中心提供了集中式配置管理能力，支持：

- **动态配置**：从配置中心获取配置，支持配置热更新
- **多环境支持**：通过命名空间和分组管理不同环境的配置
- **配置优先级**：配置中心配置 > 环境变量 > 默认配置
- **配置监听**：监听配置变更，自动刷新应用配置

## 快速开始

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

### 2. 使用配置中心

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

## 基本使用

### 获取配置

```typescript
// 基本用法
const config = await configCenter.getConfig('my-config', 'DEFAULT_GROUP');

// 指定命名空间
const config = await configCenter.getConfig(
  'my-config',
  'DEFAULT_GROUP',
  'production',
);
```

### 配置结果

`getConfig` 返回 `ConfigResult` 对象：

```typescript
interface ConfigResult {
  content: string;        // 配置内容
  md5: string;           // 配置 MD5（用于判断是否变更）
  lastModified: number;  // 最后修改时间（时间戳）
  contentType: string;   // 内容类型
}
```

### 监听配置变更

```typescript
const unsubscribe = configCenter.watchConfig(
  'my-config',
  'DEFAULT_GROUP',
  (newConfig) => {
    console.log('Config updated:', newConfig.content);
    // 更新应用配置
    updateAppConfig(JSON.parse(newConfig.content));
  },
);

// 取消监听
unsubscribe();
```

## 配置热更新

配置中心支持配置热更新，通过轮询机制检测配置变更：

```typescript
ConfigCenterModule.forRoot({
  provider: 'nacos',
  nacos: {
    watchInterval: 3000, // 每 3 秒检查一次配置变更
  },
});

// 监听配置变更
configCenter.watchConfig('my-config', 'DEFAULT_GROUP', (newConfig) => {
  // 配置变更时自动调用
  console.log('Config hot updated:', newConfig.content);
});
```

## ConfigModule 集成

ConfigModule 支持与配置中心深度集成，配置变更会自动刷新 ConfigService：

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
    configCenterPriority: true, // 配置中心配置优先级最高
  },
});

// 使用 ConfigService
import { CONFIG_SERVICE_TOKEN, ConfigService } from '@dangao/bun-server';

@Injectable()
class MyService {
  public constructor(
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
  ) {}

  public getAppName() {
    // 自动从配置中心获取，配置变更时自动更新
    return this.config.get<string>('app.name');
  }
}
```

### 配置优先级

- `configCenterPriority: true`（默认）：配置中心 > 环境变量 > 默认配置
- `configCenterPriority: false`：默认配置 > 环境变量 > 配置中心

## 装饰器使用

### @ConfigCenterValue

自动注入配置值：

```typescript
import { ConfigCenterValue, Injectable } from '@dangao/bun-server';

@Injectable()
class MyService {
  @ConfigCenterValue('app-name', 'DEFAULT_GROUP', {
    defaultValue: 'MyApp',
    watch: true, // 监听配置变更
  })
  public appName: string = '';

  public getAppName() {
    return this.appName; // 自动从配置中心获取
  }
}
```

### @NacosValue

Nacos 特定的配置值注入（便捷别名）：

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

## 最佳实践

### 1. 配置组织

- **命名空间**：用于区分不同环境（dev、test、prod）
- **分组**：用于逻辑分组（DEFAULT_GROUP、DATABASE_GROUP 等）
- **DataId**：配置的唯一标识

### 2. 配置格式

- 推荐使用 JSON 格式存储配置
- 支持纯文本配置（如 properties、yaml 等）

### 3. 配置监听

- 为关键配置启用监听（`watch: true`）
- 配置变更时及时更新应用状态
- 避免频繁的配置变更

### 4. 错误处理

- 配置获取失败时使用默认值
- 记录配置获取错误日志
- 实现配置降级策略

### 5. 性能优化

- 合理设置 `watchInterval`（建议 3-10 秒）
- 使用配置缓存减少 API 调用
- 批量获取配置（如果支持）

## 示例

完整示例请参考 `examples/microservice-app.ts`。

