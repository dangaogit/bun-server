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

## Multi-Runtime Testing

The framework ships with a shared test strategy that runs the same test cases on both Bun and Node.js.

### Test Structure

```
tests/platform/
├── shared/          ← platform-neutral assertion helpers
│   ├── suite.ts     ← TestSuite interface (test / expect / beforeEach)
│   ├── fs.cases.ts
│   ├── crypto.cases.ts
│   ├── parser.cases.ts
│   ├── process.cases.ts
│   ├── websocket.cases.ts
│   └── database.cases.ts
├── bun/             ← bun:test runners (initRuntime('bun'))
│   └── *.test.ts
└── node/            ← vitest runners (initRuntime('node'))
    ├── *.test.ts
    └── build-smoke.test.ts
```

### Running Platform Tests

```bash
# Bun platform tests only
bun run test:bun

# Node.js platform tests only (uses vitest)
bun run test:node

# Both platforms
bun run test:platform
```

### Writing Tests that Work on Both Runtimes

Always call `initRuntime()` at the start of your test file:

```ts
// tests/platform/bun/fs.test.ts
import { describe, test, expect, beforeEach } from 'bun:test';
import { initRuntime, _resetRuntime } from '../../../src/platform/runtime';
import { runFsCases } from '../shared/fs.cases';

initRuntime('bun');
runFsCases({ test, expect, beforeEach });
```

```ts
// tests/platform/node/fs.test.ts
import { describe, test, expect, beforeEach } from 'vitest';
import { initRuntime, _resetRuntime } from '../../../src/platform/runtime';
import { runFsCases } from '../shared/fs.cases';

beforeEach(() => { _resetRuntime(); initRuntime('node'); });
runFsCases({ test, expect, beforeEach });
```

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
