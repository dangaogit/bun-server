# 扩展系统

Bun Server Framework 提供了多种扩展方式，让你可以根据需求灵活地扩展应用功能。本文档介绍所有支持的扩展方式及其使用场景。

## 扩展方式概览

Bun Server 支持以下扩展方式：

1. **中间件（Middleware）** - 处理请求/响应流程
2. **应用扩展（Application Extension）** - 注册全局服务和功能
3. **模块（Module）** - 组织功能模块，支持导入导出
4. **自定义装饰器** - 扩展控制器和路由功能

## 1. 中间件（Middleware）

中间件是处理 HTTP 请求/响应流程的核心机制，可以在请求处理前后执行自定义逻辑。

### 全局中间件

通过 `app.use()` 注册全局中间件，所有请求都会经过这些中间件。

```typescript
import { Application, createLoggerMiddleware, createCorsMiddleware } from '@dangao/bun-server';

const app = new Application({ port: 3000 });

// 注册全局中间件
app.use(createLoggerMiddleware({ prefix: '[App]' }));
app.use(createCorsMiddleware({ origin: '*' }));

// 自定义中间件
app.use(async (ctx, next) => {
  // 请求前处理
  const start = Date.now();
  
  // 调用下一个中间件或路由处理器
  const response = await next();
  
  // 请求后处理
  const duration = Date.now() - start;
  console.log(`Request took ${duration}ms`);
  
  return response;
});
```

### 控制器级中间件

使用 `@UseMiddleware()` 装饰器在控制器类或方法上应用中间件。

```typescript
import { Controller, GET, UseMiddleware } from '@dangao/bun-server';

// 控制器级中间件
@Controller('/api')
@UseMiddleware(authMiddleware)
class ApiController {
  @GET('/public')
  public publicEndpoint() {
    return { message: 'Public data' };
  }

  // 方法级中间件
  @GET('/admin')
  @UseMiddleware(adminOnlyMiddleware)
  public adminEndpoint() {
    return { message: 'Admin data' };
  }
}
```

### 内置中间件

框架提供了多个内置中间件：

```typescript
import {
  createLoggerMiddleware,           // 请求日志
  createRequestLoggingMiddleware,    // 详细请求日志
  createCorsMiddleware,              // CORS 支持
  createErrorHandlingMiddleware,     // 错误处理
  createFileUploadMiddleware,        // 文件上传
  createStaticFileMiddleware,       // 静态文件服务
} from '@dangao/bun-server';

app.use(createLoggerMiddleware({ prefix: '[App]' }));
app.use(createCorsMiddleware({ origin: 'https://example.com' }));
app.use(createStaticFileMiddleware({ root: './public', prefix: '/assets' }));
```

### 推荐用法

- ✅ **全局中间件**：日志、错误处理、CORS、请求追踪
- ✅ **控制器级中间件**：认证、授权、限流
- ✅ **方法级中间件**：特定业务逻辑验证

## 2. 应用扩展（Application Extension）

应用扩展用于注册全局服务和功能，如日志系统、配置管理等。

### 使用扩展

```typescript
import { Application, LoggerExtension, SwaggerExtension, LogLevel } from '@dangao/bun-server';

const app = new Application({ port: 3000 });

// 注册 Logger 扩展
app.registerExtension(
  new LoggerExtension({
    prefix: 'MyApp',
    level: LogLevel.DEBUG,
  })
);

// 注册 Swagger 扩展
app.registerExtension(
  new SwaggerExtension({
    info: {
      title: 'My API',
      version: '1.0.0',
    },
    servers: [{ url: 'http://localhost:3000' }],
  })
);
```

### 创建自定义扩展

```typescript
import { Container } from '@dangao/bun-server';
import type { ApplicationExtension } from '@dangao/bun-server';

class MyExtension implements ApplicationExtension {
  public register(container: Container): void {
    // 注册服务到容器
    container.registerInstance('MY_SERVICE', {
      doSomething: () => console.log('Hello from extension'),
    });
  }
}

app.registerExtension(new MyExtension());
```

### 推荐用法

- ✅ **全局服务注册**：日志、配置、数据库连接
- ✅ **功能模块初始化**：Swagger、监控、缓存
- ✅ **第三方集成**：认证服务、消息队列

## 3. 模块（Module）

模块系统提供了更结构化的方式来组织代码，支持依赖注入、服务导出和模块导入。

### 基础模块

```typescript
import { Module, Injectable, Controller, GET } from '@dangao/bun-server';

@Injectable()
class UserService {
  public findAll() {
    return [{ id: '1', name: 'Alice' }];
  }
}

@Controller('/api/users')
class UserController {
  public constructor(private readonly userService: UserService) {}

  @GET('/')
  public list() {
    return this.userService.findAll();
  }
}

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // 导出供其他模块使用
})
class UserModule {}
```

### 模块导入

```typescript
import { Module } from '@dangao/bun-server';
import { UserModule } from './user.module';
import { OrderModule } from './order.module';

@Module({
  imports: [UserModule, OrderModule], // 导入其他模块
  controllers: [AppController],
  providers: [AppService],
})
class AppModule {}
```

### 官方模块

框架提供了官方模块，可以通过 `imports` 引入：

#### LoggerModule

```typescript
import { LoggerModule, LogLevel, Module } from '@dangao/bun-server';

// 配置 Logger 模块
LoggerModule.forRoot({
  logger: {
    prefix: 'MyApp',
    level: LogLevel.DEBUG,
  },
  enableRequestLogging: true,
  requestLoggingPrefix: '[MyApp]',
});

@Module({
  imports: [LoggerModule], // 导入 Logger 模块
  controllers: [UserController],
  providers: [UserService],
})
class AppModule {}
```

#### SwaggerModule

```typescript
import { SwaggerModule, Module } from '@dangao/bun-server';

// 配置 Swagger 模块
SwaggerModule.forRoot({
  info: {
    title: 'My API',
    version: '1.0.0',
    description: 'API documentation',
  },
  servers: [{ url: 'http://localhost:3000' }],
  uiPath: '/swagger',
  jsonPath: '/swagger.json',
  enableUI: true,
});

@Module({
  imports: [SwaggerModule], // 导入 Swagger 模块
  controllers: [UserController],
  providers: [UserService],
})
class AppModule {}
```

### 完整示例

```typescript
import {
  Application,
  Module,
  LoggerModule,
  SwaggerModule,
  LogLevel,
} from '@dangao/bun-server';

// 配置模块
LoggerModule.forRoot({
  logger: { prefix: 'App', level: LogLevel.INFO },
  enableRequestLogging: true,
});

SwaggerModule.forRoot({
  info: { title: 'API', version: '1.0.0' },
  uiPath: '/swagger',
});

// 应用模块
@Module({
  imports: [LoggerModule, SwaggerModule],
  controllers: [UserController, OrderController],
  providers: [UserService, OrderService],
})
class AppModule {}

// 注册模块
const app = new Application({ port: 3000 });
app.registerModule(AppModule);
app.listen();
```

### 推荐用法

- ✅ **业务模块化**：按领域拆分（UserModule、OrderModule）
- ✅ **功能模块**：使用官方模块（LoggerModule、SwaggerModule）
- ✅ **服务共享**：通过 `exports` 导出服务供其他模块使用
- ✅ **依赖管理**：通过 `imports` 管理模块依赖关系

## 4. 自定义装饰器

你可以创建自定义装饰器来扩展控制器和路由功能。

### 创建装饰器

```typescript
import 'reflect-metadata';

// 缓存装饰器
export function Cache(ttl: number) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    const cache = new Map();

    descriptor.value = async function (...args: any[]) {
      const key = JSON.stringify(args);
      if (cache.has(key)) {
        return cache.get(key);
      }
      const result = await originalMethod.apply(this, args);
      cache.set(key, result);
      setTimeout(() => cache.delete(key), ttl);
      return result;
    };
  };
}

// 使用装饰器
@Controller('/api')
class ApiController {
  @GET('/data')
  @Cache(60000) // 缓存 60 秒
  public getData() {
    return { data: 'expensive computation' };
  }
}
```

### 推荐用法

- ✅ **横切关注点**：缓存、日志、性能监控
- ✅ **业务逻辑增强**：权限检查、数据转换
- ✅ **代码复用**：通用功能封装为装饰器

## 扩展方式对比

| 扩展方式 | 适用场景 | 优势 | 劣势 |
|---------|---------|------|------|
| **中间件** | 请求/响应处理流程 | 灵活、可组合、执行顺序可控 | 不适合注册全局服务 |
| **应用扩展** | 全局服务注册、功能初始化 | 统一管理、生命周期清晰 | 需要手动注册 |
| **模块** | 代码组织、依赖管理 | 结构化、可复用、支持导入导出 | 需要理解模块系统 |
| **装饰器** | 横切关注点、代码增强 | 声明式、易用 | 功能相对单一 |

## 推荐实践

### 1. 小型项目

使用中间件和扩展即可：

```typescript
const app = new Application({ port: 3000 });

// 注册扩展
app.registerExtension(new LoggerExtension());
app.registerExtension(new SwaggerExtension({...}));

// 注册中间件
app.use(createLoggerMiddleware());
app.use(createCorsMiddleware());

// 注册控制器
app.registerController(UserController);
```

### 2. 中型项目

使用模块系统组织代码：

```typescript
@Module({
  imports: [LoggerModule, SwaggerModule],
  controllers: [UserController, OrderController],
  providers: [UserService, OrderService],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
```

### 3. 大型项目

按领域拆分模块，使用模块导入：

```typescript
// user.module.ts
@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
class UserModule {}

// order.module.ts
@Module({
  imports: [UserModule], // 导入 UserModule 使用 UserService
  controllers: [OrderController],
  providers: [OrderService],
})
class OrderModule {}

// app.module.ts
@Module({
  imports: [LoggerModule, SwaggerModule, UserModule, OrderModule],
})
class AppModule {}
```

## 总结

- **中间件**：处理请求/响应流程，适合日志、认证、错误处理
- **应用扩展**：注册全局服务，适合日志系统、配置管理
- **模块**：组织代码结构，适合业务模块化和依赖管理
- **装饰器**：增强代码功能，适合横切关注点

根据项目规模和需求，选择合适的扩展方式，或组合使用多种方式。

