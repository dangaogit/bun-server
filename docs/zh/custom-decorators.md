# 自定义注解开发指南

本文档介绍如何在 Bun Server Framework 中创建自定义装饰器和拦截器。

## 目录

- [概述](#概述)
- [创建自定义装饰器](#创建自定义装饰器)
- [创建拦截器](#创建拦截器)
- [使用 BaseInterceptor](#使用-baseinterceptor)
- [访问容器和上下文](#访问容器和上下文)
- [元数据系统](#元数据系统)
- [示例](#示例)

## 概述

Bun Server Framework 提供了强大的拦截器机制，允许您创建自定义装饰器和拦截器来实现 AOP（面向切面编程）。这使您能够添加横切关注点，如缓存、日志记录、权限检查等。

### 核心概念

- **装饰器**：一个 TypeScript 装饰器，用于在方法上添加元数据
- **拦截器**：一个拦截方法执行并可以修改行为的类
- **元数据键**：用于将装饰器与拦截器关联的 Symbol
- **拦截器注册表**：管理所有拦截器的中央注册表

## 创建自定义装饰器

### 基本装饰器模式

自定义装饰器是一个返回 `MethodDecorator` 的函数。它使用 `reflect-metadata` 在方法上存储元数据。

```typescript
import 'reflect-metadata';

// 1. 定义元数据键（使用 Symbol 确保唯一性）
export const MY_METADATA_KEY = Symbol('@my-app:my-decorator');

// 2. 定义元数据类型
export interface MyDecoratorOptions {
  option1: string;
  option2?: number;
}

// 3. 创建装饰器函数
export function MyDecorator(options: MyDecoratorOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    // 在方法上存储元数据
    Reflect.defineMetadata(MY_METADATA_KEY, options, target, propertyKey);
  };
}
```

### 装饰器命名规范

- 使用 PascalCase 命名装饰器：`@Cache()`, `@Permission()`, `@Log()`
- 使用描述性名称，表明装饰器的用途
- 元数据键应遵循模式：`Symbol('@namespace:feature')`

### 装饰器函数签名

```typescript
function MyDecorator(options?: MyOptions): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // 实现
  };
}
```

## 创建拦截器

### 实现 Interceptor 接口

拦截器必须实现 `Interceptor` 接口：

```typescript
import type { Interceptor } from '@dangao/bun-server';
import type { Container } from '@dangao/bun-server';
import type { Context } from '@dangao/bun-server';

class MyInterceptor implements Interceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    // 前置处理逻辑
    console.log(`执行 ${String(propertyKey)}`);

    // 执行原方法
    const result = await Promise.resolve(originalMethod.apply(target, args));

    // 后置处理逻辑
    console.log(`完成 ${String(propertyKey)}`);

    return result;
  }
}
```

### 注册拦截器

拦截器必须注册到 `InterceptorRegistry`：

```typescript
import { Application } from '@dangao/bun-server';
import { INTERCEPTOR_REGISTRY_TOKEN } from '@dangao/bun-server';
import type { InterceptorRegistry } from '@dangao/bun-server';

const app = new Application({ port: 3000 });
const registry = app.getContainer().resolve<InterceptorRegistry>(INTERCEPTOR_REGISTRY_TOKEN);

// 使用元数据键和优先级注册拦截器
registry.register(MY_METADATA_KEY, new MyInterceptor(), 100);
```

### 优先级系统

拦截器按优先级顺序执行（数字越小越先执行）：

- 优先级 0-50：系统拦截器（如事务）
- 优先级 51-100：框架拦截器
- 优先级 101+：应用拦截器

## 使用 BaseInterceptor

`BaseInterceptor` 提供了一个便捷的基类，包含常用操作的钩子：

```typescript
import { BaseInterceptor } from '@dangao/bun-server';
import type { Container } from '@dangao/bun-server';
import type { Context } from '@dangao/bun-server';

class MyInterceptor extends BaseInterceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    try {
      // 前置处理
      await this.before(target, propertyKey, args, container, context);

      // 执行原方法
      const result = await Promise.resolve(originalMethod.apply(target, args));

      // 后置处理
      return await this.after(target, propertyKey, result, container, context) as T;
    } catch (error) {
      // 错误处理
      return await this.onError(target, propertyKey, error, container, context);
    }
  }

  protected async before(
    target: unknown,
    propertyKey: string | symbol,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<void> {
    // 覆盖以添加前置处理逻辑
  }

  protected async after<T>(
    target: unknown,
    propertyKey: string | symbol,
    result: T,
    container: Container,
    context?: Context,
  ): Promise<T> {
    // 覆盖以添加后置处理逻辑
    return result;
  }

  protected async onError(
    target: unknown,
    propertyKey: string | symbol,
    error: unknown,
    container: Container,
    context?: Context,
  ): Promise<never> {
    // 覆盖以自定义错误处理
    throw error;
  }
}
```

### 辅助方法

`BaseInterceptor` 提供了几个辅助方法：

```typescript
// 从方法获取元数据
const metadata = this.getMetadata<MyOptions>(MY_METADATA_KEY, target, propertyKey);

// 从容器解析服务
const service = this.resolveService<MyService>(container, MyService);

// 访问上下文
const header = this.getHeader(context!, 'Authorization');
const query = this.getQuery(context!, 'page');
const param = this.getParam(context!, 'id');
```

## 访问容器和上下文

### 从容器解析服务

```typescript
class MyInterceptor extends BaseInterceptor {
  public async execute<T>(...): Promise<T> {
    // 使用辅助方法解析服务
    const userService = this.resolveService<UserService>(container, UserService);

    // 或直接解析
    const config = container.resolve<ConfigService>(CONFIG_SERVICE_TOKEN);

    // 使用服务
    const user = await userService.find(userId);
    // ...
  }
}
```

### 访问请求上下文

```typescript
class MyInterceptor extends BaseInterceptor {
  public async execute<T>(...): Promise<T> {
    if (context) {
      // 获取请求头
      const authHeader = this.getHeader(context, 'Authorization');
      const contentType = this.getHeader(context, 'Content-Type');

      // 获取查询参数
      const page = this.getQuery(context, 'page');
      const limit = this.getQuery(context, 'limit');

      // 获取路径参数
      const userId = this.getParam(context, 'id');

      // 获取请求体
      const body = await context.getBody();

      // 设置响应头
      context.setHeader('X-Custom-Header', 'value');
    }
  }
}
```

## 元数据系统

### 存储元数据

```typescript
import 'reflect-metadata';

const METADATA_KEY = Symbol('my-metadata');

// 存储元数据
Reflect.defineMetadata(METADATA_KEY, { value: 'data' }, target, propertyKey);
```

### 读取元数据

```typescript
// 读取元数据
const metadata = Reflect.getMetadata(METADATA_KEY, target, propertyKey);

// 检查元数据是否存在
const exists = Reflect.hasMetadata(METADATA_KEY, target, propertyKey);
```

### 拦截器中的元数据

```typescript
class MyInterceptor extends BaseInterceptor {
  public async execute<T>(...): Promise<T> {
    // 使用辅助方法获取元数据
    const options = this.getMetadata<MyOptions>(MY_METADATA_KEY, target, propertyKey);

    if (options) {
      // 使用选项
      console.log(`选项值: ${options.value}`);
    }
  }
}
```

## 示例

### 示例 1：简单日志拦截器

```typescript
import 'reflect-metadata';
import { BaseInterceptor } from '@dangao/bun-server';
import type { Container } from '@dangao/bun-server';
import type { Context } from '@dangao/bun-server';

const LOG_METADATA_KEY = Symbol('@my-app:log');

export function Log(message?: string): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(LOG_METADATA_KEY, { message }, target, propertyKey);
  };
}

export class LogInterceptor extends BaseInterceptor {
  public async execute<T>(...): Promise<T> {
    const metadata = this.getMetadata<{ message?: string }>(LOG_METADATA_KEY, target, propertyKey);
    const logMessage = metadata?.message || `执行 ${String(propertyKey)}`;

    console.log(`[LOG] ${logMessage} - 开始`);
    const start = Date.now();

    try {
      const result = await Promise.resolve(originalMethod.apply(target, args));
      const duration = Date.now() - start;
      console.log(`[LOG] ${logMessage} - 完成，耗时 ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[LOG] ${logMessage} - 失败，耗时 ${duration}ms`, error);
      throw error;
    }
  }
}
```

### 示例 2：限流拦截器

```typescript
import 'reflect-metadata';
import { BaseInterceptor, HttpException } from '@dangao/bun-server';
import type { Container } from '@dangao/bun-server';
import type { Context } from '@dangao/bun-server';

const RATE_LIMIT_METADATA_KEY = Symbol('@my-app:rate-limit');

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export function RateLimit(options: RateLimitOptions): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(RATE_LIMIT_METADATA_KEY, options, target, propertyKey);
  };
}

export class RateLimitInterceptor extends BaseInterceptor {
  private readonly requests = new Map<string, number[]>();

  public async execute<T>(...): Promise<T> {
    const options = this.getMetadata<RateLimitOptions>(RATE_LIMIT_METADATA_KEY, target, propertyKey);
    if (!options || !context) {
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    const clientId = this.getHeader(context, 'X-Client-Id') || context.request.headers.get('X-Forwarded-For') || 'unknown';
    const now = Date.now();
    const windowStart = now - options.windowMs;

    // 清理旧请求
    const requests = this.requests.get(clientId) || [];
    const recentRequests = requests.filter(time => time > windowStart);

    if (recentRequests.length >= options.maxRequests) {
      throw new HttpException(429, '请求过于频繁');
    }

    recentRequests.push(now);
    this.requests.set(clientId, recentRequests);

    return await Promise.resolve(originalMethod.apply(target, args));
  }
}
```

## 最佳实践

1. **使用 Symbol 作为元数据键**：确保唯一性并避免冲突
2. **遵循命名规范**：使用一致的命名模式
3. **文档化您的装饰器**：为用户提供清晰的文档
4. **优雅处理错误**：始终在拦截器中处理错误
5. **考虑性能**：最小化拦截器执行开销
6. **使用 BaseInterceptor**：利用基类实现常见模式
7. **测试您的拦截器**：编写全面的测试

## 相关资源

- [API 文档](./api.md)
- [示例](../examples/)
- [内置拦截器](../packages/bun-server/src/interceptor/builtin/)

