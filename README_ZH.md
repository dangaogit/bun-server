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
  - [AI 辅助开发](#ai-辅助开发)
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
- **完整测试矩阵**：内置单元/集成测试、压力与基准测试用例，Security 和 Swagger
  模块测试覆盖完整，便于持续优化。
- **AI 友好**：npm 包中包含完整的源码和测试文件，使 AI 工具（如 Cursor）能够
  更好地分析代码、提供建议，并深入理解框架内部实现。

## 核心特性

- 🚀 **高性能 HTTP 栈**：基于 `Bun.serve`，提供轻量
  `Application`、`Router`、`Context` 封装。
- 🧩
  **依赖注入容器**：`Container`、`@Injectable()`、`@Inject()`、模块系统、生命周期管理与自动依赖计划缓存。
- 🧵
  **中间件管道**：支持全局/控制器/方法级中间件，内置日志、错误处理、CORS、文件上传、静态资源等。
- ✅ **输入校验**：声明式验证装饰器，直连 `ValidationError` 与异常过滤器。
- 📡 **WebSocket**：`@WebSocketGateway`、`@OnMessage` 等装饰器级开发体验。
- 📖 **Swagger/OpenAPI**：内置 Swagger 插件，支持
  `@ApiTags`、`@ApiOperation`、`@ApiParam`、`@ApiBody`、`@ApiResponse`
  等装饰器，自动生成 API 文档和 Swagger UI。
- 🔐 **安全认证**：内置 SecurityModule，支持 JWT 和 OAuth2 认证，提供 `@Auth()`
  装饰器进行角色权限控制。
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

### 进阶示例：接口 + Symbol + 模块

此示例演示如何使用接口配合 Symbol token 和基于模块的依赖注入：

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

// 定义服务接口
interface UserService {
  find(id: string): Promise<{ id: string; name: string } | undefined>;
  create(name: string): { id: string; name: string };
}

// 创建 Symbol token 用于依赖注入
const UserService = Symbol("UserService");

// 实现接口
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

// 使用 Symbol-based provider 定义模块
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

// 配置模块
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: "Advanced App",
      port: 3100,
    },
  },
});

// 注册模块并启动应用
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

**关键要点：**

- **基于接口的设计**：使用 TypeScript 接口定义服务契约
- **Symbol token**：使用 `Symbol()` 创建类型安全的依赖注入 token
- **模块提供者**：使用 `provide: Symbol, useClass: Implementation` 注册提供者
- **类型安全注入**：使用 `@Inject(Symbol)` 配合接口类型进行依赖注入

## 示例与扩展

- `examples/basic-app.ts`：最小可运行示例，覆盖 DI + Logger + Middleware +
  Swagger + ConfigModule。
- `examples/full-app.ts`：包含验证、文件上传、WebSocket、复杂控制器，使用
  ConfigModule 管理端口与中间件配置。
- `examples/multi-module-app.ts`：多模块示例，展示模块间的依赖关系和服务共享，使用
  ConfigModule 统一管理应用配置。
- `examples/auth-app.ts`：完整的认证演示，包含 JWT + OAuth2
  认证流程、前端演示页面，并通过 ConfigModule 管理应用标题和端口。
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

- **中文文档**：位于 `docs/zh/` 目录
  - `docs/zh/api.md` - API 参考文档
  - `docs/zh/guide.md` - 使用指南
  - `docs/zh/extensions.md` - 扩展系统说明（中间件、扩展、模块等）
  - `docs/zh/best-practices.md` - 最佳实践
  - `docs/zh/migration.md` - 迁移指南
  - `docs/zh/deployment.md` - 生产部署指南
  - `docs/zh/performance.md` - 性能优化指南
  - `docs/zh/troubleshooting.md` - 故障排查指南
  - `docs/zh/error-handling.md` - 错误处理指南
- **英文文档**：位于 `docs/`
  目录，为默认文档；如果缺失内容，请优先参考英文版本。

## 路线图

详细路线图、阶段目标与完成情况请查阅
[`.roadmap/v0.3.0.md`](./.roadmap/v0.3.0.md)。

## AI 辅助开发

Bun Server 专为与 Cursor、GitHub Copilot 等 AI 编程助手无缝协作而设计。 框架在
npm 包分发中包含了完整的源码和测试文件，使 AI 工具能够：

- **理解框架内部实现**：AI 可以分析实际的实现代码，而不仅仅是类型定义，
  从而提供更准确的建议。
- **提供上下文感知的帮助**：当你询问框架特性时，AI 可以参考实际源码给出
  精确答案。
- **建议最佳实践**：AI 可以从框架的模式中学习，并在你的代码中建议类似的 方法。
- **更有效地调试**：AI 可以追踪框架代码来帮助诊断问题。

### AI 辅助开发最佳实践

1. **引用框架源码**：在使用 Bun Server 时，AI 工具可以访问
   `node_modules/@dangao/bun-server/src/` 目录下的源码来理解实现细节。

2. **使用类型提示**：框架提供了完整的 TypeScript 类型。在你的代码中利用
   这些类型可以帮助 AI 更好地理解你的意图。

3. **遵循框架模式**：包含的源码可作为框架模式的参考。要求 AI 建议遵循
   类似模式的代码。

4. **利用测试示例**：包含的测试文件展示了使用模式和边界情况。在向 AI
   寻求实现帮助时，可以参考这些测试。

5. **提出具体问题**：由于 AI 可以访问框架源码，你可以提出具体问题，如 "DI
   容器如何解析依赖？"，并基于实际代码获得准确答案。

## 工程规范

- **注释 & 日志**：统一使用英文，确保国际化友好。
- **Docs**：默认英文，同时在 `docs/zh/` 提供中文版本。
- **基准脚本**：存放于 `benchmark/`，运行前请确保在 Bun 环境下执行。

## 贡献指南

1. Fork & 创建特性分支
2. 提交前运行 `bun test` 和相关 benchmark
3. 提交 PR 时请附带变更说明与必要的测试数据

欢迎通过 Issue / Discussion 反馈需求或性能瓶颈。

## 许可证

本项目基于 [MIT License](./LICENSE) 开源。

## 其他语言

- [English README](./readme.md)
