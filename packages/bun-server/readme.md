# Bun Server

[![bun](https://img.shields.io/badge/Bun-1.3%2B-000?logo=bun&logoColor=fff)](https://bun.sh/)
[![typescript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/)
[![license](https://img.shields.io/badge/license-MIT-blue)](#许可证)

> Bun Server 是一个运行在 Bun Runtime 上的高性能、装饰器驱动的 DI Web
> 框架，目标是为企业级应用提供即开即用的现代体验。

- [Bun Server](#@dangao/bun-server)
  - [为什么选择 Bun Server](#为什么选择-@dangao/bun-server)
  - [核心特性](#核心特性)
  - [架构总览](#架构总览)
  - [快速上手](#快速上手)
  - [示例与扩展](#示例与扩展)
  - [性能与 Benchmark](#性能与-benchmark)
  - [文档与多语言支持](#文档与多语言支持)
  - [路线图](#路线图)
  - [工程规范](#工程规范)
  - [贡献指南](#贡献指南)
  - [许可证](#许可证)
  - [其他语言](#其他语言)

## 为什么选择 Bun Server

- **原生 Bun**：充分利用 Bun Runtime 的高性能 I/O、原生 TypeScript
  与极速包管理器。
- **现代 DX**：大量使用装饰器、元数据与
  DI，让控制器、服务、路由、验证与中间件的编写极其顺滑。
- **轻量 +
  可扩展**：松耦合的模块系统、扩展系统与日志框架，既可以快速起步，也能按需裁剪。
- **Monorepo 友好**：原生支持 Bun workspaces，使用 `workspace:*`
  协议管理内部依赖，配合 catalog 统一版本，完美适配多包协作场景。
- **完整测试矩阵**：内置单元/集成测试、压力与基准测试用例，便于持续优化。

## 核心特性

- 🚀 **高性能 HTTP 栈**：基于 `Bun.serve`，提供轻量
  `Application`、`Router`、`Context` 封装。
- 🧩
  **依赖注入容器**：`Container`、`@Injectable()`、`@Inject()`、模块系统、生命周期管理与自动依赖计划缓存。
- 🧵
  **中间件管道**：支持全局/控制器/方法级中间件，内置日志、错误处理、CORS、文件上传、静态资源等。
- ✅ **输入校验**：声明式验证装饰器，直连 `ValidationError` 与异常过滤器。
- 📡 **WebSocket**：`@WebSocketGateway`、`@OnMessage` 等装饰器级开发体验。
- 📖 **Swagger/OpenAPI**：内置 Swagger 插件，支持 `@ApiTags`、`@ApiOperation`、`@ApiParam`、`@ApiBody`、`@ApiResponse` 等装饰器，自动生成 API 文档和 Swagger UI。
- 🔐 **安全认证**：内置 SecurityModule，支持 JWT 和 OAuth2 认证，提供 `@Auth()` 装饰器进行角色权限控制。
- 📚 **示例与文档**：多语言文档、基础/完整示例、基准脚本与最佳实践。

## 架构总览

```
┌───────────────────────────────┐
│           Application         │
│  (Controllers / Modules / DI) │
└───────────────────────────────┘
                ↓
┌───────────────────────────────┐
│        Middleware Pipeline    │
│  Logging / Error / Custom ... │
└───────────────────────────────┘
                ↓
┌───────────────────────────────┐
│   Router + Context + Response │
└───────────────────────────────┘
                ↓
┌───────────────────────────────┐
│          Bun Runtime          │
└───────────────────────────────┘
```

## 快速上手

### 环境要求

- Bun ≥ `1.3.3`
- Node.js / npm 只在极少数脚手架场景使用

### 安装依赖

```bash
bun install
```

### Hello World 控制器

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

### 常用脚本

> 代码位于 `packages/@dangao/bun-server/`，以下命令请在该目录执行。

```bash
bun --cwd=packages/@dangao/bun-server test             # 运行测试
bun --cwd=benchmark run bench        # 执行所有基准测试
bun --cwd=benchmark run bench:router # 仅运行路由基准
bun --cwd=benchmark run bench:di     # 仅运行 DI 基准
```

> 直接在仓库根目录运行 `bun test`
> 会因为工作区结构导致无法找到源文件，请使用上面的命令或先进入
> `packages/@dangao/bun-server/`。

## 示例与扩展

- `examples/basic-app.ts`：最小可运行示例，覆盖 DI + Logger + Middleware + Swagger。
- `examples/full-app.ts`：包含验证、文件上传、WebSocket、复杂控制器。
- `examples/multi-module-app.ts`：多模块示例，展示模块间的依赖关系和服务共享。
- `examples/auth-app.ts`：完整的认证演示，包含 JWT + OAuth2 认证流程，前端页面演示。
- `packages/bun-server/src/extensions/`：官方扩展（如
  LoggerExtension、SwaggerExtension），可用于注册第三方能力。

## 性能与 Benchmark

`benchmark/` 目录提供可复现脚本：

| Script            | 描述                                       |
| ----------------- | ------------------------------------------ |
| `router.bench.ts` | 静态/动态路由命中、handle 以及压力测试     |
| `di.bench.ts`     | 单例解析、嵌套依赖解析、工厂解析与并发测试 |

运行方式：

```bash
bun benchmark/router.bench.ts
bun benchmark/di.bench.ts
```

或使用 `bun run bench*` 脚本批量执行，结果会以表格形式打印。

## 文档与多语言支持

- 中文默认文档位于 `docs/`
  - `docs/api.md` - API 参考文档
  - `docs/guide.md` - 使用指南
  - `docs/extensions.md` - 扩展系统说明（中间件、扩展、模块等）
  - `docs/best-practices.md` - 最佳实践
  - `docs/migration.md` - 迁移指南
- 英文草稿位于
  `docs/en/`，与中文文件结构一致；如果缺失内容，请优先参考中文版本。

## 路线图

详细路线图、阶段目标与完成情况请查阅 [`.roadmap.md`](./.roadmap.md)。

## 工程规范

- **注释 & 日志**：统一使用英文，确保国际化友好。
- **Docs**：默认中文，同时在 `docs/en/` 提供英文版本。
- **基准脚本**：存放于 `benchmark/`，运行前请确保在 Bun 环境下执行。

## 贡献指南

1. Fork & 创建特性分支
2. 提交前运行 `bun test` 和相关 benchmark
3. 提交 PR 时请附带变更说明与必要的测试数据

欢迎通过 Issue / Discussion 反馈需求或性能瓶颈。

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。

## 其他语言

- [English README](./readme_en.md)
