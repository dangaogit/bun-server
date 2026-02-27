# Testing Module

The Testing Module provides utilities for unit and integration testing of Bun Server applications. Use `Test.createTestingModule()` to build an isolated test environment with provider overrides.

## API Overview

### Test.createTestingModule()

Creates a test module builder with the given module metadata (controllers, providers, imports).

```ts
const builder = Test.createTestingModule({
  controllers: [UserController],
  providers: [UserService],
});
```

### overrideProvider().useValue() / .useClass() / .useFactory()

Override a provider with a mock or alternative implementation:

```ts
const module = await Test.createTestingModule({
  controllers: [GreetController],
  providers: [{ provide: GREETER_TOKEN, useClass: RealGreeter }],
})
  .overrideProvider(GREETER_TOKEN)
  .useValue(mockGreeter)  // or .useClass(MockGreeter) or .useFactory(() => mock)
  .compile();
```

- **useValue**: Replace with a fixed value (e.g. mock object)
- **useClass**: Replace with an alternative class
- **useFactory**: Replace with a factory function

### TestingModule.get()

Resolve a provider from the DI container:

```ts
const service = module.get(UserService);
```

### TestingModule.createApplication()

Create an `Application` instance with all providers and controllers registered. Does not start the server.

```ts
const app = module.createApplication({ port: 0 });
```

### TestingModule.createHttpClient()

Creates an `Application`, starts it on a random port, and returns a `TestHttpClient` for HTTP requests.

```ts
const client = await module.createHttpClient();
const res = await client.get('/api/users');
await client.close();
```

### TestHttpClient Methods

| Method | Description |
|--------|-------------|
| `get(path, options?)` | GET request |
| `post(path, options?)` | POST request |
| `put(path, options?)` | PUT request |
| `delete(path, options?)` | DELETE request |
| `patch(path, options?)` | PATCH request |
| `close()` | Stop the test server |

Options support `headers`, `body`, and `query`.

## Example with bun:test

```ts
import { describe, expect, test } from 'bun:test';
import { Test, Controller, GET, Inject } from '@dangao/bun-server';

const GREETER_TOKEN = Symbol('Greeter');

@Controller('/api')
class GreetController {
  public constructor(@Inject(GREETER_TOKEN) private greeter: { greet: (s: string) => string }) {}

  @GET('/greet')
  public greet(): object {
    return { message: this.greeter.greet('World') };
  }
}

describe('GreetController', () => {
  test('should return mock greeting', async () => {
    const mockGreeter = { greet: (name: string) => `Mock: ${name}` };

    const module = await Test.createTestingModule({
      controllers: [GreetController],
      providers: [{ provide: GREETER_TOKEN, useValue: mockGreeter }],
    }).compile();

    const client = await module.createHttpClient();
    const res = await client.get('/api/greet');
    await client.close();

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Mock: World' });
  });
});
```
