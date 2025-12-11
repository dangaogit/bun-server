# Extension System

Bun Server Framework provides multiple extension methods, allowing you to flexibly extend application functionality based on your needs. This document introduces all supported extension methods and their use cases.

## Extension Methods Overview

Bun Server supports the following extension methods:

1. **Middleware** - Handle request/response flow
2. **Application Extension** - Register global services and features
3. **Module** - Organize functional modules with import/export support
4. **Custom Decorators** - Extend controller and route functionality

## 1. Middleware

Middleware is the core mechanism for handling HTTP request/response flow, allowing you to execute custom logic before and after request processing.

### Global Middleware

Register global middleware via `app.use()`, and all requests will pass through these middleware.

```typescript
import { Application, createLoggerMiddleware, createCorsMiddleware } from '@dangao/bun-server';

const app = new Application({ port: 3000 });

// Register global middleware
app.use(createLoggerMiddleware({ prefix: '[App]' }));
app.use(createCorsMiddleware({ origin: '*' }));

// Custom middleware
app.use(async (ctx, next) => {
  // Pre-request processing
  const start = Date.now();
  
  // Call next middleware or route handler
  const response = await next();
  
  // Post-request processing
  const duration = Date.now() - start;
  console.log(`Request took ${duration}ms`);
  
  return response;
});
```

### Controller-Level Middleware

Use the `@UseMiddleware()` decorator to apply middleware at the controller class or method level.

```typescript
import { Controller, GET, UseMiddleware } from '@dangao/bun-server';

// Controller-level middleware
@Controller('/api')
@UseMiddleware(authMiddleware)
class ApiController {
  @GET('/public')
  public publicEndpoint() {
    return { message: 'Public data' };
  }

  // Method-level middleware
  @GET('/admin')
  @UseMiddleware(adminOnlyMiddleware)
  public adminEndpoint() {
    return { message: 'Admin data' };
  }
}
```

### Built-in Middleware

The framework provides several built-in middleware:

```typescript
import {
  createLoggerMiddleware,           // Request logging
  createRequestLoggingMiddleware,    // Detailed request logging
  createCorsMiddleware,              // CORS support
  createErrorHandlingMiddleware,     // Error handling
  createFileUploadMiddleware,        // File upload
  createStaticFileMiddleware,       // Static file serving
} from '@dangao/bun-server';

app.use(createLoggerMiddleware({ prefix: '[App]' }));
app.use(createCorsMiddleware({ origin: 'https://example.com' }));
app.use(createStaticFileMiddleware({ root: './public', prefix: '/assets' }));
```

### Recommended Usage

- ✅ **Global Middleware**: Logging, error handling, CORS, request tracing
- ✅ **Controller-Level Middleware**: Authentication, authorization, rate limiting
- ✅ **Method-Level Middleware**: Specific business logic validation

## 2. Application Extension

Application extensions are used to register global services and features, such as logging systems, configuration management, etc.

### Using Extensions

```typescript
import { Application, LoggerExtension, SwaggerExtension, LogLevel } from '@dangao/bun-server';

const app = new Application({ port: 3000 });

// Register Logger extension
app.registerExtension(
  new LoggerExtension({
    prefix: 'MyApp',
    level: LogLevel.DEBUG,
  })
);

// Register Swagger extension
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

### Creating Custom Extensions

```typescript
import { Container } from '@dangao/bun-server';
import type { ApplicationExtension } from '@dangao/bun-server';

class MyExtension implements ApplicationExtension {
  public register(container: Container): void {
    // Register services to container
    container.registerInstance('MY_SERVICE', {
      doSomething: () => console.log('Hello from extension'),
    });
  }
}

app.registerExtension(new MyExtension());
```

### Recommended Usage

- ✅ **Global Service Registration**: Logging, configuration, database connections
- ✅ **Feature Module Initialization**: Swagger, monitoring, caching
- ✅ **Third-Party Integration**: Authentication services, message queues

## 3. Module

The module system provides a more structured way to organize code, supporting dependency injection, service exports, and module imports.

### Basic Module

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
  exports: [UserService], // Export for use by other modules
})
class UserModule {}
```

### Module Imports

```typescript
import { Module } from '@dangao/bun-server';
import { UserModule } from './user.module';
import { OrderModule } from './order.module';

@Module({
  imports: [UserModule, OrderModule], // Import other modules
  controllers: [AppController],
  providers: [AppService],
})
class AppModule {}
```

### Official Modules

The framework provides official modules that can be imported via `imports`:

#### LoggerModule

```typescript
import { LoggerModule, LogLevel, Module } from '@dangao/bun-server';

// Configure Logger module
LoggerModule.forRoot({
  logger: {
    prefix: 'MyApp',
    level: LogLevel.DEBUG,
  },
  enableRequestLogging: true,
  requestLoggingPrefix: '[MyApp]',
});

@Module({
  imports: [LoggerModule], // Import Logger module
  controllers: [UserController],
  providers: [UserService],
})
class AppModule {}
```

#### SwaggerModule

```typescript
import { SwaggerModule, Module } from '@dangao/bun-server';

// Configure Swagger module
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
  imports: [SwaggerModule], // Import Swagger module
  controllers: [UserController],
  providers: [UserService],
})
class AppModule {}
```

#### SecurityModule (Recommended)

SecurityModule is a unified security module, designed following Spring Security architecture, supporting multiple authentication methods:

```typescript
import { SecurityModule, Module, Auth } from '@dangao/bun-server';

// Configure security module
SecurityModule.forRoot({
  jwt: {
    secret: 'your-secret-key',
    accessTokenExpiresIn: 3600,
    refreshTokenExpiresIn: 86400 * 7,
  },
  oauth2Clients: [
    {
      clientId: 'my-client',
      clientSecret: 'my-secret',
      redirectUris: ['http://localhost:3000/callback'],
      grantTypes: ['authorization_code', 'refresh_token'],
    },
  ],
  enableOAuth2Endpoints: true,
  excludePaths: ['/api/public'],
  defaultAuthRequired: false, // Default no auth required, controlled by @Auth() decorator
});

@Module({
  imports: [SecurityModule], // Import security module
  controllers: [UserController],
  providers: [UserService],
})
class AppModule {}

// Use @Auth() decorator to control access
@Controller('/api/users')
class UserController {
  @GET('/me')
  @Auth() // Requires authentication
  public getMe() {
    return { user: 'current user' };
  }

  @GET('/admin')
  @Auth({ roles: ['admin'] }) // Requires admin role
  public getAdmin() {
    return { message: 'admin only' };
  }
}
```

**SecurityModule Architecture Features**:
- **Core Abstraction**: `AuthenticationManager` manages authentication flow
- **Authentication Providers**: Supports multiple auth methods (JWT, OAuth2, etc.)
- **Access Decision**: `AccessDecisionManager` handles authorization decisions
- **Security Context**: `SecurityContext` manages current authentication state
- **Extensible**: Can customize authentication providers and access decision managers

#### ConfigModule (Configuration Management)

ConfigModule provides centralized configuration management, and exposes type-safe access via `ConfigService`:

```typescript
import {
  ConfigModule,
  ConfigService,
  CONFIG_SERVICE_TOKEN,
  Module,
} from '@dangao/bun-server';

// Configure module
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      port: Number(process.env.PORT ?? 3000),
      name: 'MyApp',
    },
    logger: {
      prefix: 'MyApp',
      level: 'debug',
    },
  },
  load(env) {
    // Load config from environment variables (optional)
    return {
      app: {
        port: env.APP_PORT ? Number(env.APP_PORT) : undefined,
      },
    };
  },
  validate(config) {
    if (!config.app?.name) {
      throw new Error('app.name is required');
    }
  },
});

@Module({
  imports: [ConfigModule],
  controllers: [UserController],
})
class AppModule {}

// Inject ConfigService in business code
@Controller('/api')
class UserController {
  public constructor(
    @Inject(CONFIG_SERVICE_TOKEN)
    private readonly config: ConfigService,
  ) {}

  @GET('/info')
  public info() {
    const appName = this.config.get<string>('app.name', 'MyApp');
    const port = this.config.get<number>('app.port', 3000);
    return { appName, port };
  }
}
```

**ConfigModule Highlights**:

- **Centralized configuration**: Supports default config + environment-based loading (`defaultConfig` + `load(env)`)
- **Type-safe access**: Use `ConfigService.get/getRequired` with dot-path keys (e.g. `app.port`)
- **Validation hook**: `validate(config)` can integrate class-validator style validation
- **Non-intrusive**: Examples (`basic-app.ts` / `full-app.ts` / `multi-module-app.ts` / `auth-app.ts`) use `ConfigModule` to manage ports, logger prefixes, etc.

### Complete Example

```typescript
import {
  Application,
  Module,
  LoggerModule,
  SwaggerModule,
  SecurityModule,
  LogLevel,
  Auth,
} from '@dangao/bun-server';

// Configure modules
LoggerModule.forRoot({
  logger: { prefix: 'App', level: LogLevel.INFO },
  enableRequestLogging: true,
});

SwaggerModule.forRoot({
  info: { title: 'API', version: '1.0.0' },
  uiPath: '/swagger',
});

SecurityModule.forRoot({
  jwt: {
    secret: 'your-secret-key',
    accessTokenExpiresIn: 3600,
  },
  oauth2Clients: [
    {
      clientId: 'my-client',
      clientSecret: 'my-secret',
      redirectUris: ['http://localhost:3000/callback'],
      grantTypes: ['authorization_code'],
    },
  ],
  excludePaths: ['/api/public'],
});

// Application module
@Module({
  imports: [LoggerModule, SwaggerModule, SecurityModule],
  controllers: [UserController, OrderController],
  providers: [UserService, OrderService],
})
class AppModule {}

// Register module
const app = new Application({ port: 3000 });
app.registerModule(AppModule);
app.listen();
```

### Recommended Usage

- ✅ **Business Modularization**: Split by domain (UserModule, OrderModule)
- ✅ **Feature Modules**: Use official modules (LoggerModule, SwaggerModule)
- ✅ **Service Sharing**: Export services via `exports` for use by other modules
- ✅ **Dependency Management**: Manage module dependencies via `imports`

## 4. Custom Decorators

You can create custom decorators to extend controller and route functionality.

### Creating Decorators

```typescript
import 'reflect-metadata';

// Cache decorator
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

// Using decorator
@Controller('/api')
class ApiController {
  @GET('/data')
  @Cache(60000) // Cache for 60 seconds
  public getData() {
    return { data: 'expensive computation' };
  }
}
```

### Recommended Usage

- ✅ **Cross-Cutting Concerns**: Caching, logging, performance monitoring
- ✅ **Business Logic Enhancement**: Permission checks, data transformation
- ✅ **Code Reusability**: Encapsulate common functionality as decorators

## Extension Methods Comparison

| Extension Method | Use Cases | Advantages | Disadvantages |
|-----------------|-----------|-----------|---------------|
| **Middleware** | Request/response processing flow | Flexible, composable, controllable execution order | Not suitable for registering global services |
| **Application Extension** | Global service registration, feature initialization | Unified management, clear lifecycle | Requires manual registration |
| **Module** | Code organization, dependency management | Structured, reusable, supports import/export | Requires understanding of module system |
| **Decorator** | Cross-cutting concerns, code enhancement | Declarative, easy to use | Relatively single functionality |

## Recommended Practices

### 1. Small Projects

Using middleware and extensions is sufficient:

```typescript
const app = new Application({ port: 3000 });

// Register extensions
app.registerExtension(new LoggerExtension());
app.registerExtension(new SwaggerExtension({...}));

// Register middleware
app.use(createLoggerMiddleware());
app.use(createCorsMiddleware());

// Register controllers
app.registerController(UserController);
```

### 2. Medium Projects

Use the module system to organize code:

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

### 3. Large Projects

Split modules by domain, use module imports:

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
  imports: [UserModule], // Import UserModule to use UserService
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

## Summary

- **Middleware**: Handle request/response flow, suitable for logging, authentication, error handling
- **Application Extension**: Register global services, suitable for logging systems, configuration management
- **Module**: Organize code structure, suitable for business modularization and dependency management
- **Decorator**: Enhance code functionality, suitable for cross-cutting concerns

Choose the appropriate extension method based on project scale and requirements, or combine multiple methods.

