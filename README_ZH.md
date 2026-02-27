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

### 请求生命周期

下图展示了完整的请求处理流程：

```
HTTP Request
    ↓
┌─────────────────────────────────────┐
│           中间件管道                 │  ← 全局 → 模块 → 控制器 → 方法
│  (Logger, CORS, RateLimit 等)        │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│           安全过滤器                 │  ← 认证/授权检查
│   (JWT, OAuth2, 角色检查)            │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│           路由匹配                   │  ← 路径、方法、参数
│   (静态 → 动态 → 通配符)              │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         拦截器（前置）               │  ← 全局 → 控制器 → 方法
│   (缓存、日志、转换)                  │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│           参数绑定                   │  ← @Body, @Query, @Param, @Header
│           + 验证                     │  ← @Validate, IsString, IsEmail...
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         控制器方法                   │  ← 业务逻辑执行
│   (包含 DI 注入的服务)                │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│         拦截器（后置）               │  ← 方法 → 控制器 → 全局
│   (响应转换)                         │
└─────────────────────────────────────┘
    ↓
┌─────────────────────────────────────┐
│           异常过滤器                 │  ← 异常捕获和处理
│   (HttpException, ValidationError)   │
└─────────────────────────────────────┘
    ↓
HTTP Response
```

**执行顺序**：中间件 → 安全 → 路由 → 拦截器(前置) → 验证 → 处理器 → 拦截器(后置)
→ 异常过滤器

### 模块系统

```
Application
    │
    ├── ModuleRegistry
    │   │
    │   ├── ConfigModule (配置管理)
    │   ├── LoggerModule (日志)
    │   ├── SecurityModule (安全认证)
    │   │   └── auth/ (JWT, OAuth2)
    │   ├── SwaggerModule (API 文档)
    │   ├── CacheModule (缓存)
    │   ├── DatabaseModule (数据库)
    │   │   └── ORM (Entity, Repository, Transaction)
    │   ├── QueueModule (队列)
    │   ├── SessionModule (会话)
    │   ├── MetricsModule (指标)
    │   ├── HealthModule (健康检查)
    │   └── Microservice/ (微服务)
    │       ├── ConfigCenterModule
    │       ├── ServiceRegistryModule
    │       ├── ServiceClient
    │       ├── Governance (熔断/限流/重试)
    │       └── Tracing (链路追踪)
    │
    ├── ControllerRegistry
    │   └── 所有模块的控制器
    │
    ├── WebSocketGatewayRegistry
    │   └── WebSocket 网关
    │
    └── InterceptorRegistry
        └── 拦截器注册表
```

### DI 容器架构

```
Container
    │
    ├── providers (Map<token, ProviderConfig>)
    │   ├── Singleton (单例，全局共享)
    │   ├── Transient (瞬态，每次解析创建新实例)
    │   └── Scoped (请求作用域，每个请求独立)
    │
    ├── singletons (缓存单例实例)
    │
    ├── scopedInstances (WeakMap，请求级实例缓存)
    │
    ├── dependencyPlans (依赖解析计划缓存)
    │
    └── postProcessors (实例后处理器)
```

详细的生命周期文档请参阅 [请求生命周期](./docs/zh/request-lifecycle.md)。

## 快速上手

### 环境要求

- Bun ≥ `1.3.3`
- Node.js / npm 只在极少数脚手架场景使用

### TypeScript 配置 ⚠️

**重要**：确保你的 `tsconfig.json` 包含以下装饰器配置：

```json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

没有这些配置，依赖注入将失败（注入的服务将为
`undefined`）。详见[故障排查指南](./docs/zh/troubleshooting.md#-重要注入的依赖为-undefined)。

### 安装依赖

```bash
bun install
```

### Hello World 控制器

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

### 常用脚本

> 代码位于 `packages/bun-server/`，以下命令请在该目录执行。

```bash
bun --cwd=packages/bun-server test             # 运行测试
bun --cwd=benchmark run bench        # 执行所有基准测试
bun --cwd=benchmark run bench:router # 仅运行路由基准
bun --cwd=benchmark run bench:di     # 仅运行 DI 基准
```

> 直接在仓库根目录运行 `bun test`
> 会因为工作区结构导致无法找到源文件，请使用上面的命令或先进入
> `packages/bun-server/`。

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

### 📚 分类示例

示例按难度和功能分类组织：

- **[快速入门](./examples/00-quick-start/)** - 5 分钟上手
  - `01-hello-world.ts` - 最简示例（5 行代码）
  - `02-basic-routing.ts` - HTTP 方法和路由参数
  - `03-dependency-injection.ts` - DI 基础与服务

- **[核心功能](./examples/01-core-features/)** - 深入理解框架机制
  - `basic-app.ts` - DI + Logger + Swagger + Config 集成
  - `multi-module-app.ts` - 模块依赖与组织
  - `context-scope-app.ts` - 请求作用域与 ContextService
  - `full-app.ts` - 验证、上传、静态文件、WebSocket

- **[官方模块](./examples/02-official-modules/)** - 开箱即用的模块
  - `auth-app.ts` - JWT + OAuth2 认证（含 Web UI）
  - `session-app.ts` - Session 管理
  - `database-app.ts` - 数据库连接与查询
  - `orm-app.ts` - Entity + Repository 模式
  - `cache-app.ts` - 缓存装饰器
  - `queue-app.ts` - 任务队列与 Cron 定时任务

- **[高级功能](./examples/03-advanced/)** - 自定义框架扩展
  - `custom-decorator-app.ts` - 创建自定义装饰器
  - `websocket-chat-app.ts` - 完整的 WebSocket 聊天室（含 Web UI）
  - `microservice-app.ts` - 微服务架构

- **[实战案例](./examples/04-real-world/)** - 生产级示例
  - `database-test-app.ts` - 数据库连接测试工具（Web UI）
  - `perf/app.ts` - 性能基准测试

### 🔑 Symbol + Interface 模式

本框架的特色设计 —— **Symbol + Interface 同名模式**，优雅解决 TypeScript
类型擦除问题：

```typescript
// 1. 定义接口和同名 Symbol
interface UserService {
  find(id: string): Promise<User>;
}
const UserService = Symbol('UserService');

// 2. 实现接口
@Injectable()
class UserServiceImpl implements UserService {
  async find(id: string) { ... }
}

// 3. 使用 Symbol token 注册
@Module({
  providers: [{
    provide: UserService,      // Symbol token
    useClass: UserServiceImpl, // 实现类
  }],
})

// 4. 类型安全注入
constructor(private readonly userService: UserService) {}
```

**关键**：导入时使用 `import { UserService }`（不要用
`import type { UserService }`）。

详见 [Symbol + Interface 模式指南](./docs/zh/symbol-interface-pattern.md)。

### 🔌 扩展

- `packages/bun-server/src/extensions/`：官方扩展（如
  LoggerExtension）用于集成外部能力。

### 📖 完整示例索引

查看 [examples/README.md](./examples/README.md)
获取完整目录，包含学习路径、难度评级和使用场景。

## 性能与 Benchmark

### 内部微基准

基于 `PerformanceHarness` / `StressTester` 的组件级基准测试：

| Script            | 描述                                       |
| ----------------- | ------------------------------------------ |
| `router.bench.ts` | 静态/动态路由命中、handle 以及压力测试     |
| `di.bench.ts`     | 单例解析、嵌套依赖解析、工厂解析与并发测试 |

```bash
bun benchmark/router.bench.ts
bun benchmark/di.bench.ts
```

### 框架对比（bun-server vs Express vs NestJS）

使用 [wrk](https://github.com/wg/wrk) 对真实 HTTP 端点进行压测对比，
bun-server 与 Express 5、NestJS 11 在相同端点上比较。所有框架均运行在 Bun
runtime 上，以隔离框架本身的开销差异。

**前置条件：** 需安装 wrk（`brew install wrk` / `apt install wrk`）。脚本会自动
为子进程提升 `ulimit -n` 至 10240。

```bash
bun benchmark/run-wrk-compare.ts        # 完整对比（3 个梯度）
TIER=0 bun benchmark/run-wrk-compare.ts  # 仅 Light 梯度
bun benchmark/run-wrk.ts                 # 仅 bun-server（3 个梯度）
```

> **环境：** Apple M2 Pro (8P + 4E cores) / darwin arm64 / Bun 1.3.10

#### Req/Sec 对比（Light: -t2 -c50 -d10s）

| 端点                  | bun-server   | Express  | NestJS   |
|-----------------------|--------------|----------|----------|
| GET /ping             | **31.41k**   | 30.01k   | 26.52k   |
| GET /json             | **28.22k**   | 25.99k   | 23.64k   |
| GET /users/:id        | **30.88k**   | 29.91k   | 25.62k   |
| GET /search?q=        | **29.96k**   | 28.70k   | 25.17k   |
| POST /users           | **27.65k**   | 21.37k   | 19.38k   |
| POST /users/validated | **26.60k**   | 21.28k   | 18.93k   |
| GET /middleware        | **29.52k**   | 28.57k   | 24.69k   |
| GET /headers          | **30.98k**   | 29.57k   | 26.43k   |
| GET /io               | **21.37k**   | 19.46k   | 18.49k   |

三个框架在所有梯度均零错误。Medium 和 Heavy 梯度结果请查看完整报告。

> 📊 **完整报告**（3 个梯度、延迟分布、各框架详情）：
> [`benchmark/REPORT_COMPARE.md`](./benchmark/REPORT_COMPARE.md)
>
> 📋 **单框架报告**：[`benchmark/REPORT.md`](./benchmark/REPORT.md)

### 多进程基准（reusePort, 仅 Linux）

```bash
bun benchmark/run-wrk-cluster.ts          # 默认每个 CPU 核心一个 worker
WORKERS=4 bun benchmark/run-wrk-cluster.ts
```

启动 N 个 worker 通过 `SO_REUSEPORT` 共享同一端口，内核自动做连接级负载均衡。
报告保存到 `benchmark/REPORT_CLUSTER.md`。注意：`reusePort` 仅 **Linux** 有效，
macOS/Windows 会静默忽略。

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
  - `docs/zh/request-lifecycle.md` - 请求生命周期指南
- **英文文档**：位于 `docs/`
  目录，为默认文档；如果缺失内容，请优先参考英文版本。
- **实践问题库**：位于 `skills/` 目录
  - 记录开发过程中遇到的实际问题、错误和解决方案
  - 按类别组织（events、di、modules、common）
  - 每个问题包含完整的错误信息、原因分析和修复步骤
  - [查看实践问题库](./skills/README.md)

## 路线图

详细路线图、阶段目标与完成情况请查阅 [`.roadmap/`](./.roadmap/) 目录。

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

- [English README](./README.md)
