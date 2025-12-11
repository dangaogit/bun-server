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

### Install

```bash
bun install
```

### Hello World

```ts
import "reflect-metadata";
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
  `docs/best-practices.md`, `docs/migration.md`, `docs/extensions.md`.
- **Chinese**: mirrored under `docs/zh/`. If something is missing, please fall
  back to the English source.

## Roadmap

Detailed milestones and history are tracked in
[`.roadmap/v0.3.0.md`](./.roadmap/v0.3.0.md).

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
