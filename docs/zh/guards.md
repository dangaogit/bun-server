# 守卫（Guards）

守卫是控制应用程序路由访问的强大机制。它们在路由处理器之前执行，决定请求是否应该被处理。

## 概述

守卫实现 `CanActivate` 接口，返回一个布尔值来指示请求是否应该被允许继续。与中间件不同，守卫可以访问 `ExecutionContext`，它提供了当前请求上下文的丰富信息。

### 何时使用守卫

- **认证**：验证用户是否已认证
- **授权**：检查用户是否具有所需的角色或权限
- **限流**：实现自定义限流逻辑
- **功能开关**：根据条件启用/禁用功能
- **请求验证**：在处理前验证请求元数据

## 基本用法

### 创建守卫

```typescript
import { Injectable } from '@dangao/bun-server';
import type { CanActivate, ExecutionContext } from '@dangao/bun-server';

@Injectable()
class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.getHeader('authorization');
    
    // 验证 token 并返回 true/false
    return !!token;
  }
}
```

### 应用守卫

守卫可以在不同级别应用：

#### 控制器级别

```typescript
import { Controller, GET, UseGuards } from '@dangao/bun-server';

@Controller('/api/users')
@UseGuards(AuthGuard)
class UserController {
  @GET('/')
  getUsers() {
    return { users: [] };
  }
}
```

#### 方法级别

```typescript
@Controller('/api')
class ApiController {
  @GET('/public')
  publicEndpoint() {
    return { message: '公开' };
  }

  @GET('/private')
  @UseGuards(AuthGuard)
  privateEndpoint() {
    return { message: '私有' };
  }
}
```

#### 全局守卫

```typescript
import { SecurityModule } from '@dangao/bun-server';

SecurityModule.forRoot({
  jwt: { secret: 'your-secret' },
  globalGuards: [AuthGuard, RolesGuard],
});
```

## 执行顺序

守卫按以下顺序执行：

1. **全局守卫**（按注册顺序）
2. **控制器守卫**（按装饰器顺序）
3. **方法守卫**（按装饰器顺序）

```
HTTP 请求
    ↓
中间件管道
    ↓
安全过滤器（Token 提取和认证）
    ↓
守卫（全局 → 控制器 → 方法）
    ↓
拦截器（前置）
    ↓
路由处理器
    ↓
拦截器（后置）
    ↓
HTTP 响应
```

## 内置守卫

### AuthGuard

检查用户是否已认证：

```typescript
import { Controller, GET, UseGuards, AuthGuard } from '@dangao/bun-server';

@Controller('/api/profile')
@UseGuards(AuthGuard)
class ProfileController {
  @GET('/')
  getProfile() {
    // 只有已认证的用户可以访问
    return { profile: {} };
  }
}
```

### OptionalAuthGuard

允许未认证访问，但如果有 token 会进行验证：

```typescript
import { Controller, GET, UseGuards, OptionalAuthGuard } from '@dangao/bun-server';

@Controller('/api/posts')
class PostController {
  @GET('/')
  @UseGuards(OptionalAuthGuard)
  getPosts() {
    // 无论是否认证都允许访问
    return { posts: [] };
  }
}
```

### RolesGuard

检查用户是否具有所需角色：

```typescript
import { Controller, GET, UseGuards, AuthGuard, RolesGuard, Roles } from '@dangao/bun-server';

@Controller('/api/admin')
@UseGuards(AuthGuard, RolesGuard)
class AdminController {
  @GET('/dashboard')
  @Roles('admin')
  dashboard() {
    return { message: '管理员仪表板' };
  }

  @GET('/super')
  @Roles('admin', 'superadmin')  // 任一角色即可访问
  superAdmin() {
    return { message: '超级管理员' };
  }
}
```

## 自定义守卫

### 基本自定义守卫

```typescript
import { Injectable } from '@dangao/bun-server';
import type { CanActivate, ExecutionContext } from '@dangao/bun-server';

@Injectable()
class ApiKeyGuard implements CanActivate {
  private readonly validApiKeys = ['key1', 'key2'];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.getHeader('x-api-key');
    
    return this.validApiKeys.includes(apiKey || '');
  }
}
```

### 异步守卫

```typescript
@Injectable()
class SubscriptionGuard implements CanActivate {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.auth?.user?.id;
    
    if (!userId) return false;
    
    const subscription = await this.subscriptionService.getSubscription(userId);
    return subscription?.isActive ?? false;
  }
}
```

### 访问元数据的守卫

```typescript
@Injectable()
class FeatureFlagGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const feature = this.reflector.getAllAndOverride<string>(
      'feature',
      context.getClass(),
      context.getMethodName(),
    );
    
    if (!feature) return true;
    
    return this.isFeatureEnabled(feature);
  }

  private isFeatureEnabled(feature: string): boolean {
    // 检查功能开关状态
    return true;
  }
}
```

## ExecutionContext

`ExecutionContext` 提供以下访问能力：

### HTTP 上下文

```typescript
const httpHost = context.switchToHttp();
const request = httpHost.getRequest();  // Context 对象
const response = httpHost.getResponse(); // ResponseBuilder（如果可用）
```

### 控制器和方法信息

```typescript
const controllerClass = context.getClass();    // 控制器类
const handler = context.getHandler();          // 方法函数
const methodName = context.getMethodName();    // 方法名字符串
```

### 元数据访问

```typescript
const metadata = context.getMetadata<string[]>('roles');
// 先检查方法，再检查类
```

## Reflector 工具类

`Reflector` 类帮助检索元数据：

```typescript
import { Reflector, REFLECTOR_TOKEN } from '@dangao/bun-server';

@Injectable()
class MyGuard implements CanActivate {
  constructor(@Inject(REFLECTOR_TOKEN) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 获取元数据，方法优先
    const roles = this.reflector.getAllAndOverride<string[]>(
      ROLES_METADATA_KEY,
      context.getClass(),
      context.getMethodName(),
    );
    
    // 合并类和方法的元数据
    const permissions = this.reflector.getAllAndMerge<string[]>(
      'permissions',
      context.getClass(),
      context.getMethodName(),
    );
    
    return true;
  }
}
```

## 自定义角色守卫工厂

创建自定义的角色守卫：

```typescript
import { createRolesGuard } from '@dangao/bun-server';

// 要求所有角色而不是任一角色
const AllRolesGuard = createRolesGuard({ matchAll: true });

// 自定义角色提取
const CustomRolesGuard = createRolesGuard({
  getRoles: (context) => {
    const request = context.switchToHttp().getRequest();
    return request.auth?.user?.permissions || [];
  },
});
```

## 错误处理

守卫可以抛出异常来拒绝请求：

```typescript
import { ForbiddenException, UnauthorizedException } from '@dangao/bun-server';

@Injectable()
class StrictAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    if (!request.auth?.isAuthenticated) {
      throw new UnauthorizedException('需要认证');
    }
    
    if (!this.hasPermission(request.auth.user)) {
      throw new ForbiddenException('权限不足');
    }
    
    return true;
  }
}
```

## 最佳实践

1. **保持守卫专注**：每个守卫应该只处理一个关注点
2. **使用依赖注入**：对于复杂逻辑，注入服务
3. **优先抛出异常**：比返回 false 提供更好的错误消息
4. **顺序很重要**：在 RolesGuard 之前应用 AuthGuard
5. **使用内置守卫**：尽可能使用 AuthGuard 和 RolesGuard
6. **测试你的守卫**：为守卫逻辑编写单元测试

## 与 SecurityModule 集成

守卫与 SecurityModule 无缝配合：

```typescript
import { Application, SecurityModule, AuthGuard, RolesGuard } from '@dangao/bun-server';

const app = new Application();

app.registerModule(
  SecurityModule.forRoot({
    jwt: {
      secret: 'your-jwt-secret',
      accessTokenExpiresIn: 3600,
    },
    excludePaths: ['/public', '/health'],
    globalGuards: [AuthGuard],  // 应用于所有路由
  }),
);
```

## 参见

- [请求生命周期](./request-lifecycle.md)
- [安全模块](./guide.md#security-module)
- [自定义装饰器](./custom-decorators.md)

