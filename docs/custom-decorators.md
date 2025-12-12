# Custom Decorators Guide

This guide explains how to create custom decorators and interceptors in Bun Server Framework.

## Table of Contents

- [Overview](#overview)
- [Creating Custom Decorators](#creating-custom-decorators)
- [Creating Interceptors](#creating-interceptors)
- [Using BaseInterceptor](#using-baseinterceptor)
- [Accessing Container and Context](#accessing-container-and-context)
- [Metadata System](#metadata-system)
- [Examples](#examples)

## Overview

Bun Server Framework provides a powerful interceptor mechanism that allows you to create custom decorators and interceptors for AOP (Aspect-Oriented Programming). This enables you to add cross-cutting concerns like caching, logging, permission checking, and more.

### Key Concepts

- **Decorator**: A TypeScript decorator that adds metadata to methods
- **Interceptor**: A class that intercepts method execution and can modify behavior
- **Metadata Key**: A Symbol used to link decorators with interceptors
- **Interceptor Registry**: A central registry that manages all interceptors

## Creating Custom Decorators

### Basic Decorator Pattern

A custom decorator is a function that returns a `MethodDecorator`. It uses `reflect-metadata` to store metadata on the method.

```typescript
import 'reflect-metadata';

// 1. Define a metadata key (use Symbol for uniqueness)
export const MY_METADATA_KEY = Symbol('@my-app:my-decorator');

// 2. Define metadata type
export interface MyDecoratorOptions {
  option1: string;
  option2?: number;
}

// 3. Create the decorator function
export function MyDecorator(options: MyDecoratorOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    // Store metadata on the method
    Reflect.defineMetadata(MY_METADATA_KEY, options, target, propertyKey);
  };
}
```

### Decorator Naming Conventions

- Use PascalCase for decorator names: `@Cache()`, `@Permission()`, `@Log()`
- Use descriptive names that indicate the decorator's purpose
- Metadata keys should follow the pattern: `Symbol('@namespace:feature')`

### Decorator Function Signature

```typescript
function MyDecorator(options?: MyOptions): MethodDecorator {
  return (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) => {
    // Implementation
  };
}
```

## Creating Interceptors

### Implementing the Interceptor Interface

An interceptor must implement the `Interceptor` interface:

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
    // Pre-processing logic
    console.log(`Executing ${String(propertyKey)}`);

    // Execute the original method
    const result = await Promise.resolve(originalMethod.apply(target, args));

    // Post-processing logic
    console.log(`Completed ${String(propertyKey)}`);

    return result;
  }
}
```

### Registering Interceptors

Interceptors must be registered with the `InterceptorRegistry`:

```typescript
import { Application } from '@dangao/bun-server';
import { INTERCEPTOR_REGISTRY_TOKEN } from '@dangao/bun-server';
import type { InterceptorRegistry } from '@dangao/bun-server';

const app = new Application({ port: 3000 });
const registry = app.getContainer().resolve<InterceptorRegistry>(INTERCEPTOR_REGISTRY_TOKEN);

// Register interceptor with metadata key and priority
registry.register(MY_METADATA_KEY, new MyInterceptor(), 100);
```

### Priority System

Interceptors are executed in order of priority (lower numbers execute first):

- Priority 0-50: System interceptors (e.g., transactions)
- Priority 51-100: Framework interceptors
- Priority 101+: Application interceptors

## Using BaseInterceptor

`BaseInterceptor` provides a convenient base class with hooks for common operations:

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
      // Pre-processing
      await this.before(target, propertyKey, args, container, context);

      // Execute original method
      const result = await Promise.resolve(originalMethod.apply(target, args));

      // Post-processing
      return await this.after(target, propertyKey, result, container, context) as T;
    } catch (error) {
      // Error handling
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
    // Override to add pre-processing logic
  }

  protected async after<T>(
    target: unknown,
    propertyKey: string | symbol,
    result: T,
    container: Container,
    context?: Context,
  ): Promise<T> {
    // Override to add post-processing logic
    return result;
  }

  protected async onError(
    target: unknown,
    propertyKey: string | symbol,
    error: unknown,
    container: Container,
    context?: Context,
  ): Promise<never> {
    // Override to customize error handling
    throw error;
  }
}
```

### Helper Methods

`BaseInterceptor` provides several helper methods:

```typescript
// Get metadata from method
const metadata = this.getMetadata<MyOptions>(MY_METADATA_KEY, target, propertyKey);

// Resolve service from container
const service = this.resolveService<MyService>(container, MyService);

// Access context
const header = this.getHeader(context!, 'Authorization');
const query = this.getQuery(context!, 'page');
const param = this.getParam(context!, 'id');
```

## Accessing Container and Context

### Resolving Services from Container

```typescript
class MyInterceptor extends BaseInterceptor {
  public async execute<T>(...): Promise<T> {
    // Resolve service using helper method
    const userService = this.resolveService<UserService>(container, UserService);

    // Or resolve directly
    const config = container.resolve<ConfigService>(CONFIG_SERVICE_TOKEN);

    // Use the service
    const user = await userService.find(userId);
    // ...
  }
}
```

### Accessing Request Context

```typescript
class MyInterceptor extends BaseInterceptor {
  public async execute<T>(...): Promise<T> {
    if (context) {
      // Get request headers
      const authHeader = this.getHeader(context, 'Authorization');
      const contentType = this.getHeader(context, 'Content-Type');

      // Get query parameters
      const page = this.getQuery(context, 'page');
      const limit = this.getQuery(context, 'limit');

      // Get path parameters
      const userId = this.getParam(context, 'id');

      // Get request body
      const body = await context.getBody();

      // Set response headers
      context.setHeader('X-Custom-Header', 'value');
    }
  }
}
```

## Metadata System

### Storing Metadata

```typescript
import 'reflect-metadata';

const METADATA_KEY = Symbol('my-metadata');

// Store metadata
Reflect.defineMetadata(METADATA_KEY, { value: 'data' }, target, propertyKey);
```

### Reading Metadata

```typescript
// Read metadata
const metadata = Reflect.getMetadata(METADATA_KEY, target, propertyKey);

// Check if metadata exists
const exists = Reflect.hasMetadata(METADATA_KEY, target, propertyKey);
```

### Metadata in Interceptors

```typescript
class MyInterceptor extends BaseInterceptor {
  public async execute<T>(...): Promise<T> {
    // Get metadata using helper method
    const options = this.getMetadata<MyOptions>(MY_METADATA_KEY, target, propertyKey);

    if (options) {
      // Use options
      console.log(`Option value: ${options.value}`);
    }
  }
}
```

## Examples

### Example 1: Simple Logging Interceptor

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
    const logMessage = metadata?.message || `Executing ${String(propertyKey)}`;

    console.log(`[LOG] ${logMessage} - Start`);
    const start = Date.now();

    try {
      const result = await Promise.resolve(originalMethod.apply(target, args));
      const duration = Date.now() - start;
      console.log(`[LOG] ${logMessage} - Completed in ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[LOG] ${logMessage} - Failed after ${duration}ms`, error);
      throw error;
    }
  }
}
```

### Example 2: Rate Limiting Interceptor

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

    // Clean old requests
    const requests = this.requests.get(clientId) || [];
    const recentRequests = requests.filter(time => time > windowStart);

    if (recentRequests.length >= options.maxRequests) {
      throw new HttpException(429, 'Too Many Requests');
    }

    recentRequests.push(now);
    this.requests.set(clientId, recentRequests);

    return await Promise.resolve(originalMethod.apply(target, args));
  }
}
```

## Best Practices

1. **Use Symbols for Metadata Keys**: Ensures uniqueness and avoids conflicts
2. **Follow Naming Conventions**: Use consistent naming patterns
3. **Document Your Decorators**: Provide clear documentation for users
4. **Handle Errors Gracefully**: Always handle errors in interceptors
5. **Consider Performance**: Minimize overhead in interceptor execution
6. **Use BaseInterceptor**: Leverage the base class for common patterns
7. **Test Your Interceptors**: Write comprehensive tests

## See Also

- [API Documentation](./api.md)
- [Examples](../examples/)
- [Built-in Interceptors](../packages/bun-server/src/interceptor/builtin/)

