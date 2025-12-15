# Bun Server

[![bun](https://img.shields.io/badge/Bun-1.3%2B-000?logo=bun&logoColor=fff)](https://bun.sh/)
[![typescript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/badge/license-MIT-blue)](#license)

> A high-performance, decorator-driven DI web framework running on Bun Runtime.

- [Why Bun Server](#why-@dangao/bun-server)
- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Examples & Extensions](#examples--extensions)
- [Benchmark Suite](#benchmark-suite)
- [Docs & Localization](#docs--localization)
- [Roadmap](#roadmap)
- [AI-Assisted Development](#ai-assisted-development)
- [Engineering Guidelines](#engineering-guidelines)
- [Contributing](#contributing)
- [License](#license)
- [Other Languages](#other-languages)

## Why Bun Server

- **Native Bun**: built on top of `Bun.serve`, embracing native TS, fast I/O and
  the Bun package manager.
- **Modern DX**: decorators, metadata and DI everywhere — controllers, services,
  middleware, validation.
- **Lightweight yet extensible**: modular DI + extension layer + logging
  provider that scales from MVP to enterprise.
- **Well-tested**: unit, integration, stress and benchmark suites ship with the
  repo.
- **AI-friendly**: source code and tests are included in the npm package,
  enabling AI tools (like Cursor) to provide better code analysis, suggestions,
  and understanding of the framework internals.

## Features

- 🚀 **Fast HTTP stack** powered by Bun with `Application`, `Router`, `Context`
  and `ResponseBuilder` helpers.
- 🧩 **Dependency injection container** with `@Injectable`, `@Inject`, module
  metadata, lifecycle management and cached dependency plans.
- 🧵 **Middleware pipeline** with global/class/method scopes plus built-ins
  (logging, error, CORS, upload, static, ...).
- ✅ **Input validation** via decorators and `ValidationError` integration.
- 📡 **WebSocket gateways** with `@WebSocketGateway`, `@OnMessage`, etc.
- 📚 **Docs & samples** including multi-language docs, benchmark scripts and
  best practices.

## Architecture

```
Application (Controllers / Modules / DI)
          ↓
    Middleware Pipeline
          ↓
 Router + Context + Response
          ↓
        Bun Runtime
```

## Getting Started

### Requirements

- Bun ≥ `1.3.3`

### TypeScript Configuration ⚠️

**Critical**: Ensure your `tsconfig.json` includes these decorator settings:

```json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

Without these, dependency injection will fail (injected services will be `undefined`). See [Troubleshooting Guide](./docs/troubleshooting.md#-critical-injected-dependencies-are-undefined) for details.

### Install

```bash
bun install
```

### Hello World

```ts
import { Application, Controller, GET, Injectable } from "@dangao/bun-server";

@Injectable()
class HealthService {
  public ping() {
    return { status: "ok" };
  }
}

@Controller("/api")
class HealthController {
  public constructor(private readonly service: HealthService) {}

  @GET("/health")
  public check() {
    return this.service.ping();
  }
}

const app = new Application({ port: 3100 });
app.getContainer().register(HealthService);
app.registerController(HealthController);
app.listen();
```

### Useful scripts

```bash
bun --cwd=packages/@dangao/bun-server test
bun --cwd=packages/@dangao/bun-server run bench
bun --cwd=packages/@dangao/bun-server run bench:router
bun --cwd=packages/@dangao/bun-server run bench:di
```

> Running `bun test` from the repo root fails because Bun only scans the current
> workspace. Use the commands above or `cd packages/@dangao/bun-server` first.

### Advanced Example: Interface + Symbol + Module

This example demonstrates using interfaces with Symbol tokens and module-based
dependency injection:

```ts
import {
  Application,
  Body,
  CONFIG_SERVICE_TOKEN,
  ConfigModule,
  ConfigService,
  Controller,
  GET,
  Inject,
  Injectable,
  Module,
  Param,
  POST,
} from "@dangao/bun-server";

// Define service interface
interface UserService {
  find(id: string): Promise<{ id: string; name: string } | undefined>;
  create(name: string): { id: string; name: string };
}

// Create Symbol token for DI
const UserService = Symbol("UserService");

// Implement the interface
@Injectable()
class UserServiceImpl implements UserService {
  private readonly users = new Map<string, { id: string; name: string }>([
    ["1", { id: "1", name: "Alice" }],
  ]);

  public async find(id: string) {
    return this.users.get(id);
  }

  public create(name: string) {
    const id = String(this.users.size + 1);
    const user = { id, name };
    this.users.set(id, user);
    return user;
  }
}

@Controller("/api/users")
class UserController {
  public constructor(
    private readonly service: UserService,
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
  ) {}

  @GET("/:id")
  public async getUser(@Param("id") id: string) {
    const user = await this.service.find(id);
    if (!user) {
      return { error: "Not Found" };
    }
    return user;
  }

  @POST("/")
  public createUser(@Body("name") name: string) {
    return this.service.create(name);
  }
}

// Define module with Symbol-based provider
@Module({
  controllers: [UserController],
  providers: [
    {
      provide: UserService,
      useClass: UserServiceImpl,
    },
  ],
  exports: [UserService],
})
class UserModule {}

// Configure modules
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: "Advanced App",
      port: 3100,
    },
  },
});

// Register module and start application
@Module({
  imports: [ConfigModule],
  controllers: [UserController],
  providers: [
    {
      provide: UserService,
      useClass: UserServiceImpl,
    },
  ],
})
class AppModule {}

const app = new Application({ port: 3100 });
app.registerModule(AppModule);
app.listen();
```

**Key points:**

- **Interface-based design**: Define contracts with TypeScript interfaces
- **Symbol tokens**: Use `Symbol()` for type-safe dependency injection tokens
- **Module providers**: Register providers using
  `provide: Symbol, useClass: Implementation`
- **Type-safe injection**: Inject services using `@Inject(Symbol)` with
  interface types

## Examples & Extensions

- `examples/basic-app.ts`: minimal DI + Logger + Middleware showcase.
- `examples/full-app.ts`: advanced controllers, validation, uploads, WebSocket.
- `packages/@dangao/bun-server/src/extensions/`: official extensions (e.g.
  `LoggerExtension`) for plugging in external capabilities.

## Benchmark Suite

Benchmarks live in `benchmark/` and rely on `PerformanceHarness` &
`StressTester`.

| Script            | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `router.bench.ts` | static/dynamic route hits, `router.handle` and stress runs            |
| `di.bench.ts`     | singleton vs factory resolves, nested dependencies, concurrent stress |

Run directly:

```bash
bun benchmark/router.bench.ts
bun benchmark/di.bench.ts
```

Or use `bun run bench*` scripts for convenience.

## Docs & Localization

- **English** (default): `docs/api.md`, `docs/guide.md`,
  `docs/best-practices.md`, `docs/migration.md`, `docs/extensions.md`,
  `docs/deployment.md`, `docs/performance.md`, `docs/troubleshooting.md`,
  `docs/error-handling.md`.
- **Chinese**: mirrored under `docs/zh/`. If something is missing, please fall
  back to the English source.

## Roadmap

Detailed milestones and history are tracked in
[`.roadmap/v0.3.0.md`](./.roadmap/v0.3.0.md).

## AI-Assisted Development

Bun Server is designed to work seamlessly with AI coding assistants like Cursor,
GitHub Copilot, and others. The framework includes source code and tests in the
npm package distribution, enabling AI tools to:

- **Understand framework internals**: AI can analyze the actual implementation
  code, not just type definitions, providing more accurate suggestions.
- **Provide context-aware help**: When you ask about framework features, AI can
  reference the actual source code to give precise answers.
- **Suggest best practices**: AI can learn from the framework's patterns and
  suggest similar approaches in your code.
- **Debug more effectively**: AI can trace through the framework code to help
  diagnose issues.

### Best Practices for AI-Assisted Development

1. **Reference framework source**: When working with Bun Server, AI tools can
   access the source code at `node_modules/@dangao/bun-server/src/` to
   understand implementation details.

2. **Use type hints**: The framework provides comprehensive TypeScript types.
   Leverage these in your code to help AI understand your intent better.

3. **Follow framework patterns**: The included source code serves as a reference
   for framework patterns. Ask AI to suggest code that follows similar patterns.

4. **Leverage test examples**: The included test files demonstrate usage
   patterns and edge cases. Reference these when asking AI for implementation
   help.

5. **Ask specific questions**: Since AI can access the framework source, you can
   ask specific questions like "How does the DI container resolve dependencies?"
   and get accurate answers based on the actual code.

## Engineering Guidelines

- Comments & log messages **must be in English** to keep the codebase
  international-friendly.
- Documentation defaults to English; Chinese copies live in `docs/zh/`.
- Benchmarks belong to `benchmark/` and should run inside Bun environments.

## Contributing

1. Fork & create a feature branch.
2. Run `bun test` (and relevant benchmarks if the change affects performance).
3. Submit a PR with a clear description and test evidence.

Issues and discussions are welcome for new ideas or perf bottlenecks.

## License

Released under the [MIT License](./LICENSE).

## Other Languages

- [中文 README](./readme_zh.md)

Enjoy building on Bun Server!
