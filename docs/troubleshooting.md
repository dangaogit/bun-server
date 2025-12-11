# Troubleshooting Guide

This guide helps you diagnose and resolve common issues when using Bun Server
Framework.

## Table of Contents

- [Common Issues](#common-issues)
- [Module Registration](#module-registration)
- [Dependency Injection](#dependency-injection)
- [Routing Issues](#routing-issues)
- [Performance Issues](#performance-issues)
- [Debugging Tips](#debugging-tips)

## Common Issues

### Provider Not Found

**Error**: `Provider not found for token: Symbol(...)`

**Cause**: A module's `forRoot()` method was called before the `Application`
instance was created, or the module wasn't registered with
`app.registerModule()`.

**Solution**:

```typescript
// ❌ Wrong: Module.forRoot() before Application
ConfigModule.forRoot({ defaultConfig: {} });
const app = new Application({ port: 3000 });

// ✅ Correct: Module.forRoot() before Application, then register
ConfigModule.forRoot({ defaultConfig: {} });
const app = new Application({ port: 3000 });
app.registerModule(ConfigModule);
```

### Module Metadata Not Cleared

**Error**: Tests fail with "Module already registered" or unexpected behavior in
tests.

**Cause**: Module metadata persists between tests.

**Solution**: Clear module metadata in `beforeEach`:

```typescript
import { MODULE_METADATA_KEY } from "../../src/di/module";

beforeEach(() => {
  Reflect.deleteMetadata(MODULE_METADATA_KEY, YourModule);
});
```

### Port Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use`

**Cause**: Another process is using the port, or a previous test didn't clean
up.

**Solution**: Use `getTestPort()` utility in tests:

```typescript
import { getTestPort } from "../utils/test-port";

const port = getTestPort();
const app = new Application({ port });
```

## Module Registration

### Module Order Matters

Modules should be registered in dependency order. If `AppModule` depends on
`ConfigModule`, register `ConfigModule` first:

```typescript
ConfigModule.forRoot({ defaultConfig: {} });
CacheModule.forRoot({ defaultTtl: 60000 });
const app = new Application({ port: 3000 });
app.registerModule(ConfigModule);
app.registerModule(CacheModule);
app.registerModule(AppModule);
```

### Circular Dependencies

**Error**: Circular dependency detected or infinite loop during module
initialization.

**Solution**: Refactor modules to remove circular dependencies, or use lazy
loading:

```typescript
// Use dynamic import for circular dependencies
const { SomeService } = await import("./some-service");
```

## Dependency Injection

### Service Not Injectable

**Error**: `Cannot resolve dependency` or service not found.

**Solution**: Ensure the service is decorated with `@Injectable()`:

```typescript
@Injectable()
class UserService {
  // ...
}
```

### Token Not Found

**Error**: `Provider not found for token`

**Solution**: Ensure the token is exported from the module and the module is
registered:

```typescript
// In module
@Module({
  providers: [
    { provide: MY_TOKEN, useValue: myService },
  ],
  exports: [MY_TOKEN],
})
class MyModule {}
```

## Routing Issues

### Route Not Found (404)

**Possible Causes**:

1. Controller not registered
2. Route path mismatch
3. HTTP method mismatch

**Solution**:

```typescript
// Ensure controller is registered
@Module({
  controllers: [UserController],
})
class AppModule {}

// Check route path
@Controller("/api/users")
class UserController {
  @GET("/:id") // Matches /api/users/:id
  public getUser(@Param("id") id: string) {}
}
```

### Parameter Not Bound

**Error**: `@Param('id')` returns `undefined`

**Solution**: Ensure the parameter name matches the route parameter:

```typescript
// Route: /api/users/:id
@GET('/:id')
public getUser(@Param('id') id: string) {  // ✅ Correct
  // ...
}

@GET('/:id')
public getUser(@Param('userId') userId: string) {  // ❌ Wrong
  // ...
}
```

## Performance Issues

### Slow Request Handling

**Possible Causes**:

1. Heavy computation in request handler
2. Synchronous blocking operations
3. Large response payloads

**Solution**:

```typescript
// Use async/await for I/O operations
@GET('/users')
public async getUsers() {
  return await this.userService.findAll();  // ✅ Async
}

// Avoid blocking operations
@GET('/users')
public getUsers() {
  return this.userService.findAllSync();  // ❌ Blocking
}
```

### Memory Leaks

**Symptoms**: Memory usage increases over time.

**Possible Causes**:

1. Event listeners not cleaned up
2. Timers/intervals not cleared
3. Cache not expiring

**Solution**:

```typescript
// Clean up in afterEach/afterAll
afterEach(async () => {
  await app.stop();
  ModuleRegistry.getInstance().clear();
});

// Use TTL for cache
CacheModule.forRoot({
  defaultTtl: 3600000, // 1 hour
});
```

## Debugging Tips

### Enable Debug Logging

Set log level to `DEBUG`:

```typescript
LoggerModule.forRoot({
  logger: {
    level: LogLevel.DEBUG,
  },
});
```

### Check Module Metadata

Inspect module metadata:

```typescript
import { MODULE_METADATA_KEY } from "../../src/di/module";

const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, YourModule);
console.log("Module metadata:", metadata);
```

### Verify Container State

Check what's registered in the container:

```typescript
const container = app.getContainer();
// Inspect container internals (implementation-dependent)
```

### Use Test Utilities

Use test utilities for consistent test setup:

```typescript
import { getTestPort } from "../utils/test-port";

const port = getTestPort();
const app = new Application({ port });
```

## Getting Help

If you're still experiencing issues:

1. Check the [API Documentation](./api.md)
2. Review [Examples](../examples/)
3. Search existing [GitHub Issues](https://github.com/your-repo/issues)
4. Create a new issue with:
   - Bun version
   - Framework version
   - Minimal reproduction code
   - Error messages and stack traces
