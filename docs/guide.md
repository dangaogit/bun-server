# Usage Guide

Covers key steps for building Bun Server applications from scratch.

## 1. Initialize Application

```ts
import 'reflect-metadata';
import { Application } from '@dangao/bun-server';

const app = new Application({ port: 3000 });
app.listen();
```

> Tip: Default port is 3000, can be adjusted via `app.listen(customPort)` or `new Application({ port })`.

## 2. Register Controllers and Dependencies

```ts
import {
  Controller,
  GET,
  POST,
  Body,
  Param,
  Injectable,
  Application,
} from '@dangao/bun-server';

@Injectable()
class UserService {
  public findById(id: string) {
    return { id, name: 'Alice' };
  }
}

@Controller('/api/users')
class UserController {
  public constructor(private readonly userService: UserService) {}

  @GET('/:id')
  public getUser(@Param('id') id: string) {
    return this.userService.findById(id);
  }
}

const app = new Application({ port: 3000 });
app.getContainer().register(UserService);
app.registerController(UserController);
app.listen();
```

## 3. Using Middleware

```ts
import { createLoggerMiddleware, createCorsMiddleware } from '@dangao/bun-server';

const app = new Application({ port: 3000 });

// Global middleware
app.use(createLoggerMiddleware({ prefix: '[App]' }));
app.use(createCorsMiddleware({ origin: '*' }));

// Custom middleware
app.use(async (ctx, next) => {
  console.log('Before request');
  const response = await next();
  console.log('After request');
  return response;
});
```

## 4. Parameter Validation

```ts
import { Validate, IsString, IsEmail, MinLength } from '@dangao/bun-server';

@Controller('/api/users')
class UserController {
  @POST('/')
  public createUser(
    @Body('name') @Validate(IsString(), MinLength(3)) name: string,
    @Body('email') @Validate(IsEmail()) email: string,
  ) {
    return { name, email };
  }
}
```

## 5. WebSocket Gateway

```ts
import { WebSocketGateway, OnMessage } from '@dangao/bun-server';

@WebSocketGateway('/ws')
class ChatGateway {
  @OnMessage
  public handleMessage(ws: ServerWebSocket, message: string) {
    ws.send(`Echo: ${message}`);
  }
}

const app = new Application({ port: 3000 });
app.registerWebSocketGateway(ChatGateway);
app.listen();
```

## 6. File Upload and Static Resources

```ts
import { createFileUploadMiddleware, createStaticFileMiddleware } from '@dangao/bun-server';

const app = new Application({ port: 3000 });

// File upload
app.use(createFileUploadMiddleware({ maxSize: 5 * 1024 * 1024 }));

// Static files
app.use(createStaticFileMiddleware({ root: './public', prefix: '/assets' }));
```

## 7. Error Handling and Custom Filters

```ts
import { HttpException, ExceptionFilterRegistry } from '@dangao/bun-server';

@Controller('/api')
class ApiController {
  @GET('/error')
  public throwError() {
    throw new HttpException(400, 'Bad Request');
  }
}

// Register custom exception filter
ExceptionFilterRegistry.register(HttpException, (error, ctx) => {
  return ctx.createResponse({ error: error.message }, { status: error.status });
});
```

## 8. Extension System

Bun Server provides multiple extension methods, including middleware, application extensions, module system, etc. For detailed information, please refer to [Extension System Documentation](./extensions.md).

### Quick Examples

#### Using Module Approach (Recommended)

```typescript
import { Module, LoggerModule, SwaggerModule, LogLevel } from '@dangao/bun-server';

// Configure modules
LoggerModule.forRoot({
  logger: { prefix: 'App', level: LogLevel.INFO },
  enableRequestLogging: true,
});

SwaggerModule.forRoot({
  info: { title: 'API', version: '1.0.0' },
  uiPath: '/swagger',
});

@Module({
  imports: [LoggerModule, SwaggerModule],
  controllers: [UserController],
  providers: [UserService],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
```

#### Using Extension Approach

```typescript
import { LoggerExtension, SwaggerExtension } from '@dangao/bun-server';

const app = new Application({ port: 3000 });

app.registerExtension(new LoggerExtension({ prefix: 'App' }));
app.registerExtension(new SwaggerExtension({
  info: { title: 'API', version: '1.0.0' },
}));
```

#### Using Middleware

```typescript
import { createLoggerMiddleware, createCorsMiddleware } from '@dangao/bun-server';

const app = new Application({ port: 3000 });

app.use(createLoggerMiddleware({ prefix: '[App]' }));
app.use(createCorsMiddleware({ origin: '*' }));
```

For more extension methods and use cases, please refer to [Extension System Documentation](./extensions.md).

## 9. Testing Recommendations

- Use `tests/utils/test-port.ts` to get auto-incrementing ports, avoiding local conflicts.
- Call `RouteRegistry.getInstance().clear()` and `ControllerRegistry.getInstance().clear()` in `afterEach` hooks to keep global state clean.
- In end-to-end tests, you can directly instantiate `Context` and call `router.handle(context)` without actually starting the server.
