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

### Request Lifecycle

The following diagram shows the complete request processing flow:

```
HTTP Request
    ↓
┌─────────────────────────────────────┐
│         Middleware Pipeline         │  ← Global → Module → Controller → Method
│  (Logger, CORS, RateLimit, etc.)    │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         Security Filter             │  ← Authentication / Authorization
│   (JWT, OAuth2, Role Check)         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         Router Matching             │  ← Path, Method, Params
│   (Static → Dynamic → Wildcard)     │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       Interceptors (Pre)            │  ← Global → Controller → Method
│   (Cache, Log, Transform)           │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       Parameter Binding             │  ← @Body, @Query, @Param, @Header
│       + Validation                  │  ← @Validate, IsString, IsEmail...
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       Controller Method             │  ← Business Logic Execution
│   (with DI injected services)       │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       Interceptors (Post)           │  ← Method → Controller → Global
│   (Response Transform)              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│       Exception Filter              │  ← Exception Handling
│   (HttpException, ValidationError)  │
└─────────────────────────────────────┘
    ↓
HTTP Response
```

**Execution Order**: Middleware → Security → Router → Interceptors(Pre) →
Validation → Handler → Interceptors(Post) → Exception Filter

### Module System

```
Application
    │
    ├── ModuleRegistry
    │   │
    │   ├── ConfigModule (Configuration)
    │   ├── LoggerModule (Logging)
    │   ├── SecurityModule (Authentication)
    │   │   └── auth/ (JWT, OAuth2)
    │   ├── SwaggerModule (API Docs)
    │   ├── CacheModule (Caching)
    │   ├── DatabaseModule (Database)
    │   │   └── ORM (Entity, Repository, Transaction)
    │   ├── QueueModule (Job Queue)
    │   ├── SessionModule (Session)
    │   ├── MetricsModule (Metrics)
    │   ├── HealthModule (Health Check)
    │   └── Microservice/
    │       ├── ConfigCenterModule
    │       ├── ServiceRegistryModule
    │       ├── ServiceClient
    │       ├── Governance (Circuit Breaker/Rate Limit/Retry)
    │       └── Tracing
    │
    ├── ControllerRegistry
    │   └── All module controllers
    │
    ├── WebSocketGatewayRegistry
    │   └── WebSocket gateways
    │
    └── InterceptorRegistry
        └── Interceptor registry
```

### DI Container

```
Container
    │
    ├── providers (Map<token, ProviderConfig>)
    │   ├── Singleton (shared globally)
    │   ├── Transient (new instance per resolve)
    │   └── Scoped (per-request instance)
    │
    ├── singletons (singleton instance cache)
    │
    ├── scopedInstances (WeakMap, request-level cache)
    │
    ├── dependencyPlans (dependency resolution plan cache)
    │
    └── postProcessors (instance post-processors)
```

For detailed lifecycle documentation, see
[Request Lifecycle](./docs/request-lifecycle.md).

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

Without these, dependency injection will fail (injected services will be
`undefined`). See
[Troubleshooting Guide](./docs/troubleshooting.md#-critical-injected-dependencies-are-undefined)
for details.

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
bun --cwd=packages/bun-server test
bun --cwd=packages/bun-server run bench
bun --cwd=packages/bun-server run bench:router
bun --cwd=packages/bun-server run bench:di
```

> Running `bun test` from the repo root fails because Bun only scans the current
> workspace. Use the commands above or `cd packages/bun-server` first.

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

### 📚 Organized Examples

Examples are organized by difficulty and feature category:

- **[Quick Start](./examples/00-quick-start/)** - Get started in 5 minutes
  - `01-hello-world.ts` - Minimal example (5 lines)
  - `02-basic-routing.ts` - HTTP methods and route parameters
  - `03-dependency-injection.ts` - DI basics with services

- **[Core Features](./examples/01-core-features/)** - Deep dive into framework
  mechanics
  - `basic-app.ts` - DI + Logger + Swagger + Config integration
  - `multi-module-app.ts` - Module dependencies and organization
  - `context-scope-app.ts` - Request scoping and ContextService
  - `full-app.ts` - Validation, uploads, static files, WebSocket

- **[Official Modules](./examples/02-official-modules/)** - Ready-to-use modules
  - `auth-app.ts` - JWT + OAuth2 authentication (with Web UI)
  - `session-app.ts` - Session management
  - `database-app.ts` - Database connection and queries
  - `orm-app.ts` - Entity + Repository pattern
  - `cache-app.ts` - Caching with decorators
  - `queue-app.ts` - Task queues and Cron jobs

- **[Advanced](./examples/03-advanced/)** - Custom framework extensions
  - `custom-decorator-app.ts` - Create custom decorators
  - `websocket-chat-app.ts` - Complete WebSocket chat with rooms (with Web UI)
  - `microservice-app.ts` - Microservices architecture

- **[Real World](./examples/04-real-world/)** - Production-ready examples
  - `database-test-app.ts` - Database connection tester (Web UI)
  - `perf/app.ts` - Performance benchmarking

### 🔑 Symbol + Interface Pattern

This framework features a unique **Symbol + Interface co-naming pattern** that
solves TypeScript's type erasure problem:

```typescript
// 1. Define interface and Symbol with same name
interface UserService {
  find(id: string): Promise<User>;
}
const UserService = Symbol('UserService');

// 2. Implement interface
@Injectable()
class UserServiceImpl implements UserService {
  async find(id: string) { ... }
}

// 3. Register with Symbol token
@Module({
  providers: [{
    provide: UserService,      // Symbol token
    useClass: UserServiceImpl, // Implementation
  }],
})

// 4. Inject with type safety
constructor(private readonly userService: UserService) {}
```

**Key**: Import as `import { UserService }` (not `import type { UserService }`).

See [Symbol + Interface Pattern Guide](./docs/symbol-interface-pattern.md) for
details.

### 🔌 Extensions

- `packages/bun-server/src/extensions/`: Official extensions (e.g.
  `LoggerExtension`) for plugging in external capabilities.

### 📖 Complete Example Index

See [examples/README.md](./examples/README.md) for the complete catalog with
learning paths, difficulty ratings, and usage scenarios.

## Benchmark Suite

### Internal Micro-benchmarks

`PerformanceHarness` & `StressTester` based benchmarks:

| Script            | Description                                                           |
| ----------------- | --------------------------------------------------------------------- |
| `router.bench.ts` | static/dynamic route hits, `router.handle` and stress runs            |
| `di.bench.ts`     | singleton vs factory resolves, nested dependencies, concurrent stress |

```bash
bun benchmark/router.bench.ts
bun benchmark/di.bench.ts
```

### HTTP End-to-End Benchmark (wrk)

Real HTTP load testing with [wrk](https://github.com/wg/wrk), covering JSON
responses, route params, body parsing, validation, middleware chains, file I/O,
and more. Three concurrency tiers expose the latency inflection point.

**Prerequisites:** wrk (`brew install wrk` / `apt install wrk`). The script
automatically raises `ulimit -n` to 10240 for child processes; if your shell
default is low (e.g. macOS default 256), no manual action is needed.

```bash
bun benchmark/run-wrk.ts        # auto start server, run wrk, generate report
```

> **Environment:** Apple M2 Pro (8P + 4E cores) / darwin arm64 / Bun 1.3.10 / @dangao/bun-server 1.9.0

#### Light (-t2 -c50 -d10s)

| Endpoint              | Req/Sec  | Avg Latency | P99 Latency | Transfer/sec |
|-----------------------|----------|-------------|-------------|--------------|
| GET /ping             | 31.97k   | 784.89us    | 1.56ms      | 20.82MB      |
| GET /json             | 27.71k   | 0.91ms      | 1.78ms      | 107.44MB     |
| GET /users/:id        | 30.40k   | 826.46us    | 1.62ms      | 20.77MB      |
| GET /search?q=        | 29.49k   | 0.86ms      | 1.69ms      | 21.03MB      |
| POST /users           | 27.51k   | 0.92ms      | 1.77ms      | 18.89MB      |
| POST /users/validated | 26.55k   | 0.95ms      | 1.84ms      | 19.50MB      |
| GET /middleware        | 29.69k   | 845.58us    | 1.64ms      | 20.90MB      |
| GET /headers          | 30.01k   | 847.13us    | 1.69ms      | 19.53MB      |
| GET /io               | 21.39k   | 1.17ms      | 2.37ms      | 15.05MB      |

#### Medium (-t4 -c200 -d10s)

| Endpoint              | Req/Sec  | Avg Latency | P99 Latency | Transfer/sec |
|-----------------------|----------|-------------|-------------|--------------|
| GET /ping             | 14.76k   | 3.42ms      | 5.05ms      | 19.22MB      |
| GET /json             | 13.49k   | 3.72ms      | 4.62ms      | 104.33MB     |
| GET /users/:id        | 14.45k   | 3.49ms      | 4.87ms      | 19.74MB      |
| GET /search?q=        | 14.16k   | 3.54ms      | 4.34ms      | 20.21MB      |
| POST /users           | 13.06k   | 3.86ms      | 4.92ms      | 17.95MB      |
| POST /users/validated | 12.42k   | 4.06ms      | 5.13ms      | 18.25MB      |
| GET /middleware        | 13.27k   | 4.91ms      | 57.05ms     | 18.60MB      |
| GET /headers          | 14.38k   | 3.49ms      | 4.19ms      | 18.71MB      |
| GET /io               | 10.37k   | 4.85ms      | 6.54ms      | 14.60MB      |

#### Heavy (-t8 -c500 -d10s)

| Endpoint              | Req/Sec  | Avg Latency | P99 Latency | Transfer/sec |
|-----------------------|----------|-------------|-------------|--------------|
| GET /ping             | 7.34k    | 8.45ms      | 9.64ms      | 19.10MB      |
| GET /json             | 6.68k    | 9.28ms      | 10.56ms     | 102.82MB     |
| GET /users/:id        | 7.18k    | 8.62ms      | 9.98ms      | 19.52MB      |
| GET /search?q=        | 7.09k    | 8.77ms      | 10.16ms     | 20.21MB      |
| POST /users           | 6.52k    | 9.50ms      | 10.82ms     | 17.77MB      |
| POST /users/validated | 6.28k    | 9.87ms      | 11.40ms     | 18.43MB      |
| GET /middleware        | 7.12k    | 8.69ms      | 9.82ms      | 20.06MB      |
| GET /headers          | 7.26k    | 8.54ms      | 9.77ms      | 18.89MB      |
| GET /io               | 5.10k    | 12.19ms     | 15.10ms     | 14.35MB      |

**Key takeaways:** zero errors across all tiers; total throughput stays stable
(~550k reqs/10s) while latency scales linearly with concurrency; file I/O
endpoint is ~30% slower than pure compute; P99 stays below 15ms even at 500
concurrent connections.

## Docs & Localization

- **English** (default): `docs/api.md`, `docs/guide.md`,
  `docs/best-practices.md`, `docs/migration.md`, `docs/extensions.md`,
  `docs/deployment.md`, `docs/performance.md`, `docs/troubleshooting.md`,
  `docs/error-handling.md`, `docs/request-lifecycle.md`.
- **Chinese**: mirrored under `docs/zh/`. If something is missing, please fall
  back to the English source.
- **Skills & Troubleshooting**: `skills/` directory
  - Real-world problems encountered during development with solutions
  - Organized by category (events, di, modules, common)
  - Each issue includes complete error info, root cause analysis, and fix steps
  - [View Skills Repository](./skills/README.md)

## Roadmap

Detailed milestones and history are tracked in the [`.roadmap/`](./.roadmap/)
directory.

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
