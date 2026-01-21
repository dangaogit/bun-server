# Guards

Guards are a powerful mechanism for controlling access to routes in your application. They execute before the route handler and determine whether a request should be processed.

## Overview

Guards implement the `CanActivate` interface and return a boolean value indicating whether the request should be allowed to proceed. Unlike middleware, guards have access to the `ExecutionContext`, which provides rich information about the current request context.

### When to Use Guards

- **Authentication**: Verify if a user is authenticated
- **Authorization**: Check if a user has the required roles or permissions
- **Rate limiting**: Implement custom rate limiting logic
- **Feature flags**: Enable/disable features based on conditions
- **Request validation**: Validate request metadata before processing

## Basic Usage

### Creating a Guard

```typescript
import { Injectable } from '@dangao/bun-server';
import type { CanActivate, ExecutionContext } from '@dangao/bun-server';

@Injectable()
class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request.getHeader('authorization');
    
    // Validate token and return true/false
    return !!token;
  }
}
```

### Applying Guards

Guards can be applied at different levels:

#### Controller Level

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

#### Method Level

```typescript
@Controller('/api')
class ApiController {
  @GET('/public')
  publicEndpoint() {
    return { message: 'Public' };
  }

  @GET('/private')
  @UseGuards(AuthGuard)
  privateEndpoint() {
    return { message: 'Private' };
  }
}
```

#### Global Guards

```typescript
import { SecurityModule } from '@dangao/bun-server';

SecurityModule.forRoot({
  jwt: { secret: 'your-secret' },
  globalGuards: [AuthGuard, RolesGuard],
});
```

## Execution Order

Guards execute in the following order:

1. **Global guards** (in registration order)
2. **Controller guards** (in decoration order)
3. **Method guards** (in decoration order)

```
HTTP Request
    ↓
Middleware Pipeline
    ↓
Security Filter (Token extraction & Authentication)
    ↓
Guards (Global → Controller → Method)
    ↓
Interceptors (Pre)
    ↓
Route Handler
    ↓
Interceptors (Post)
    ↓
HTTP Response
```

## Built-in Guards

### AuthGuard

Checks if the user is authenticated:

```typescript
import { Controller, GET, UseGuards, AuthGuard } from '@dangao/bun-server';

@Controller('/api/profile')
@UseGuards(AuthGuard)
class ProfileController {
  @GET('/')
  getProfile() {
    // Only authenticated users can access
    return { profile: {} };
  }
}
```

### OptionalAuthGuard

Allows access without authentication but validates token if present:

```typescript
import { Controller, GET, UseGuards, OptionalAuthGuard } from '@dangao/bun-server';

@Controller('/api/posts')
class PostController {
  @GET('/')
  @UseGuards(OptionalAuthGuard)
  getPosts() {
    // Access allowed with or without authentication
    return { posts: [] };
  }
}
```

### RolesGuard

Checks if the user has required roles:

```typescript
import { Controller, GET, UseGuards, AuthGuard, RolesGuard, Roles } from '@dangao/bun-server';

@Controller('/api/admin')
@UseGuards(AuthGuard, RolesGuard)
class AdminController {
  @GET('/dashboard')
  @Roles('admin')
  dashboard() {
    return { message: 'Admin Dashboard' };
  }

  @GET('/super')
  @Roles('admin', 'superadmin')  // Either role grants access
  superAdmin() {
    return { message: 'Super Admin' };
  }
}
```

## Custom Guards

### Basic Custom Guard

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

### Async Guard

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

### Guard with Metadata Access

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
    // Check feature flag status
    return true;
  }
}
```

## ExecutionContext

The `ExecutionContext` provides access to:

### HTTP Context

```typescript
const httpHost = context.switchToHttp();
const request = httpHost.getRequest();  // Context object
const response = httpHost.getResponse(); // ResponseBuilder (if available)
```

### Controller and Method Info

```typescript
const controllerClass = context.getClass();    // Controller class
const handler = context.getHandler();          // Method function
const methodName = context.getMethodName();    // Method name string
```

### Metadata Access

```typescript
const metadata = context.getMetadata<string[]>('roles');
// First checks method, then class
```

## Reflector Utility

The `Reflector` class helps with metadata retrieval:

```typescript
import { Reflector, REFLECTOR_TOKEN } from '@dangao/bun-server';

@Injectable()
class MyGuard implements CanActivate {
  constructor(@Inject(REFLECTOR_TOKEN) private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Get metadata with method priority
    const roles = this.reflector.getAllAndOverride<string[]>(
      ROLES_METADATA_KEY,
      context.getClass(),
      context.getMethodName(),
    );
    
    // Merge class and method metadata
    const permissions = this.reflector.getAllAndMerge<string[]>(
      'permissions',
      context.getClass(),
      context.getMethodName(),
    );
    
    return true;
  }
}
```

## Custom Roles Guard Factory

Create customized role guards:

```typescript
import { createRolesGuard } from '@dangao/bun-server';

// Require ALL roles instead of ANY
const AllRolesGuard = createRolesGuard({ matchAll: true });

// Custom role extraction
const CustomRolesGuard = createRolesGuard({
  getRoles: (context) => {
    const request = context.switchToHttp().getRequest();
    return request.auth?.user?.permissions || [];
  },
});
```

## Error Handling

Guards can throw exceptions to reject requests:

```typescript
import { ForbiddenException, UnauthorizedException } from '@dangao/bun-server';

@Injectable()
class StrictAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    if (!request.auth?.isAuthenticated) {
      throw new UnauthorizedException('Authentication required');
    }
    
    if (!this.hasPermission(request.auth.user)) {
      throw new ForbiddenException('Insufficient permissions');
    }
    
    return true;
  }
}
```

## Best Practices

1. **Keep guards focused**: Each guard should handle one concern
2. **Use dependency injection**: Inject services for complex logic
3. **Prefer throwing exceptions**: Provides better error messages than returning false
4. **Order matters**: Apply AuthGuard before RolesGuard
5. **Use built-in guards**: Leverage AuthGuard and RolesGuard when possible
6. **Test your guards**: Write unit tests for guard logic

## Integration with SecurityModule

Guards work seamlessly with the SecurityModule:

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
    globalGuards: [AuthGuard],  // Applied to all routes
  }),
);
```

## See Also

- [Request Lifecycle](./request-lifecycle.md)
- [Security Module](./guide.md#security-module)
- [Custom Decorators](./custom-decorators.md)

