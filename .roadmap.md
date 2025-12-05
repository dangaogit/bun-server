# Bun Server Framework

本项目基于 Bun 实现一个高性能、类型安全、支持依赖注入（DI）的现代 Web 框架。

## 设计目标

- **高性能**：充分利用 Bun 的运行时优势，提供极致的性能表现
- **类型安全**：完整的 TypeScript 支持，提供优秀的开发体验
- **依赖注入**：内置 DI 容器，支持装饰器模式的依赖注入
- **现代化**：基于装饰器和元数据，提供简洁优雅的 API
- **可扩展**：支持中间件、插件系统，易于扩展

## 整体架构

### 核心层次

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                    │
│  (Controllers, Services, Middleware, Decorators)        │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Framework Core                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Router     │  │  DI Container│  │  Middleware   │ │
│  │   System     │  │   System     │  │   System     │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Request    │  │   Response   │  │   Error      │ │
│  │   Handler    │  │   Handler    │  │   Handler    │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│                    Bun Runtime Layer                     │
│              (Bun.serve(), WebSocket, etc.)             │
└─────────────────────────────────────────────────────────┘
```

### 核心模块

#### 1. **应用核心 (Application Core)**

- `Application`: 应用主类，负责初始化和启动
- `Server`: 服务器封装，基于 `Bun.serve()` 构建
- `Context`: 请求上下文，封装 Request/Response

#### 2. **路由系统 (Router)**

- `Router`: 路由管理器，支持 RESTful 路由
- `Route`: 路由定义，支持路径参数、查询参数
- `RouteRegistry`: 路由注册表，管理所有路由
- 装饰器：`@GET()`, `@POST()`, `@PUT()`, `@DELETE()`, `@PATCH()`, `@Route()`

#### 3. **依赖注入系统 (DI Container)**

- `Container`: DI 容器，管理依赖生命周期
- `Provider`: 提供者接口，定义依赖提供方式
- `Injectable`: 可注入装饰器，标记可注入类
- `Inject`: 注入装饰器，标记需要注入的属性
- 生命周期：`Singleton`, `Transient`, `Scoped`

#### 11. **模块系统 (Module System)**

- `@Module()`: 描述模块的 `imports` / `controllers` / `providers` / `exports`
- `ModuleRegistry`: 负责解析模块依赖、检测循环引用并隔离容器
- `Application.registerModule()`: 将模块挂载到应用，自动注册控制器、提供者和导出
- 模块内的控制器会使用模块容器解析依赖，只有导出的 provider
  才能被其他模块或应用级代码访问

#### 4. **中间件系统 (Middleware)**

- `Middleware`: 中间件接口
- `MiddlewarePipeline`: 中间件管道，支持链式调用
- 内置中间件：日志、CORS、Body 解析、错误处理
- 装饰器：`@UseMiddleware()`

#### 5. **控制器系统 (Controller)**

- `Controller`: 控制器基类
- `ControllerRegistry`: 控制器注册表
- 装饰器：`@Controller()`, `@Body()`, `@Query()`, `@Param()`, `@Header()`

#### 6. **请求/响应处理**

- `Request`: 请求封装，扩展原生 Request
- `Response`: 响应封装，提供便捷的响应方法
- `BodyParser`: 请求体解析器（JSON、FormData、URLEncoded）
- `ResponseBuilder`: 响应构建器

#### 7. **参数验证 (Validation)**

- `Validator`: 验证器接口
- `ValidationMiddleware`: 验证中间件
- 装饰器：`@Validate()`, `@IsString()`, `@IsNumber()`, `@IsEmail()`, etc.

#### 8. **错误处理 (Error Handling)**

- `ErrorHandler`: 全局错误处理器
- `HttpException`: HTTP 异常基类
- `ExceptionFilter`: 异常过滤器

#### 9. **类型系统 (Type System)**

- `Metadata`: 元数据管理，基于 Reflect Metadata
- `TypeInfo`: 类型信息提取和存储
- 装饰器元数据支持

#### 10. **工具模块 (Utilities)**

- `Logger`: 日志系统
- `Config`: 配置管理
- `Utils`: 工具函数集合

## 技术栈

- **运行时**: Bun (最新稳定版)
- **语言**: TypeScript 5.x
- **元数据**: `reflect-metadata` (用于装饰器元数据)
- **测试**: `bun:test` (Bun 内置测试框架)

## 项目结构

```
@dangao/bun-server/
├── src/
│   ├── core/                    # 核心模块
│   │   ├── application.ts       # 应用主类
│   │   ├── server.ts            # 服务器封装
│   │   └── context.ts           # 请求上下文
│   ├── router/                  # 路由系统
│   │   ├── router.ts
│   │   ├── route.ts
│   │   └── registry.ts
│   ├── di/                      # 依赖注入
│   │   ├── container.ts
│   │   ├── provider.ts
│   │   └── decorators.ts
│   ├── middleware/              # 中间件系统
│   │   ├── middleware.ts
│   │   ├── pipeline.ts
│   │   └── builtin/             # 内置中间件
│   ├── controller/              # 控制器系统
│   │   ├── controller.ts
│   │   ├── decorators.ts
│   │   └── registry.ts
│   ├── request/                 # 请求处理
│   │   ├── request.ts
│   │   ├── response.ts
│   │   └── parser.ts
│   ├── validation/              # 参数验证
│   │   ├── validator.ts
│   │   └── decorators.ts
│   ├── error/                   # 错误处理
│   │   ├── handler.ts
│   │   ├── exception.ts
│   │   └── filter.ts
│   ├── metadata/                # 元数据系统
│   │   ├── metadata.ts
│   │   └── type-info.ts
│   ├── utils/                   # 工具模块
│   │   ├── logger.ts
│   │   ├── config.ts
│   │   └── helpers.ts
│   └── index.ts                 # 入口文件
├── tests/                       # 测试文件
├── examples/                    # 示例代码
├── package.json
├── tsconfig.json
└── readme.md
```

## 使用示例

```typescript
import {
  Application,
  Body,
  Controller,
  Get,
  Injectable,
  Post,
} from "@dangao/bun-server";

// 定义服务
@Injectable()
class UserService {
  async findUser(id: string) {
    return { id, name: "John Doe" };
  }
}

// 定义控制器
@Controller("/api/users")
class UserController {
  constructor(private userService: UserService) {}

  @Get("/:id")
  async getUser(id: string) {
    return await this.userService.findUser(id);
  }

  @Post()
  async createUser(@Body() user: { name: string }) {
    return { id: "1", ...user };
  }
}

// 启动应用
const app = new Application();
app.registerController(UserController);
app.listen(3000);
```

### 模块化定义

```typescript
import {
  Application,
  Controller,
  GET,
  Injectable,
  Module,
} from "@dangao/bun-server";

@Injectable()
class UserServiceModule {
  public all() {
    return [{ id: "1", name: "Alice" }];
  }
}

@Controller("/api/users")
class UserControllerModule {
  public constructor(private readonly users: UserServiceModule) {}

  @GET("/")
  public list() {
    return this.users.all();
  }
}

@Module({
  controllers: [UserControllerModule],
  providers: [UserServiceModule],
  exports: [UserServiceModule],
})
class UserModule {}

const app = new Application({ port: 3100 });
app.registerModule(UserModule);
app.listen();
```

### 测试与性能工具

```typescript
import { PerformanceHarness, StressTester } from "@dangao/bun-server";

await PerformanceHarness.benchmark("router", 1000, (index) => {
  // 在此执行需要基准的逻辑
});

await StressTester.run("di:resolve", 200, 10, async (iteration) => {
  // 在此执行并发压力任务
});
```

更多示例见 `benchmark/` 目录（`benchmark/README.md`），可直接执行
`bun run bench` 获取路由、DI 等基准结果。

## 开发路线图 (Roadmap)

### Phase 1: 基础架构 (Foundation) ✅

**目标**: 建立核心架构，实现基本的 HTTP 服务器和路由功能

- [x] 项目初始化 ✅
  - [x] 配置 TypeScript 和构建环境
  - [x] 设置项目结构和基础工具
  - [x] 实现 `Application` 和 `Server` 核心类
  - [x] 实现基础的 `Context` 封装
  - [x] 编写基础测试用例

- [x] 路由系统 ✅
  - [x] 实现 `Router` 和路由匹配算法
  - [x] 实现路由装饰器 (`@GET`, `@POST`, etc.)
  - [x] 支持路径参数和查询参数
  - [x] 实现路由注册和查找机制
  - [x] 编写路由系统测试

- [x] 请求/响应处理 ✅
  - [x] 实现 `Request` 和 `Response` 封装
  - [x] 实现 `BodyParser` (JSON, FormData, URLEncoded)
  - [x] 实现参数绑定装饰器 (`@Body`, `@Query`, `@Param`, `@Header`)
  - [x] 编写请求处理测试

### Phase 2: 依赖注入系统 (DI System)

**目标**: 实现完整的依赖注入容器和装饰器支持

- [x] DI 容器核心 ✅
  - [x] 实现 `Container` 基础功能
  - [x] 实现依赖解析和注入机制
  - [x] 支持构造函数注入
  - [x] 实现生命周期管理 (Singleton, Transient)
  - [x] 编写 DI 容器测试

- [x] 装饰器支持 ✅
  - [x] 实现 `@Injectable()` 装饰器
  - [x] 实现 `@Inject()` 装饰器
  - [x] 集成 `reflect-metadata` 支持
  - [x] 实现类型信息提取
  - [x] 编写装饰器测试

- [x] 控制器集成 ✅
  - [x] 实现 `@Controller()` 装饰器
  - [x] 实现控制器自动注册
  - [x] 实现控制器依赖注入
  - [x] 完善参数绑定功能（已有 `@Body`, `@Query`, `@Param`, `@Header`）
  - [x] 编写控制器集成测试并确保通过

### Phase 3: 中间件系统 (Middleware) ✅

**目标**: 实现中间件管道和常用内置中间件

- [x] 中间件核心 ✅
  - [x] 实现 `Middleware` 接口
  - [x] 实现 `MiddlewarePipeline` 管道
  - [x] 实现 `@UseMiddleware()` 装饰器
  - [x] 支持全局和路由级中间件
  - [x] 编写中间件测试（管道 + 集成测试）

- [x] 内置中间件 ✅
  - [x] 实现日志中间件
  - [x] 实现 CORS 中间件
  - [x] 实现错误处理中间件
  - [x] 实现请求日志中间件
  - [x] 编写内置中间件测试

### Phase 4: 参数验证 (Validation) ✅

**目标**: 实现参数验证和类型校验

- [x] 验证系统 ✅
  - [x] 实现 `Validator` 接口与 `ValidationError`
  - [x] 实现验证装饰器 (`@Validate`, `@IsString`, `@IsEmail`, `@MinLength`,
        etc.)
  - [x] 实现常用验证规则
  - [x] 集成验证流程至控制器路由
  - [x] 编写验证单元与集成测试

### Phase 5: 错误处理 (Error Handling) ✅

**目标**: 实现全局错误处理和异常系统

- [x] 错误处理 ✅
  - [x] 实现 `HttpException` 及常用子类
  - [x] 实现全局错误处理器与默认错误中间件
  - [x] 实现异常过滤器注册与执行
  - [x] 支持自定义错误响应与 ValidationError 映射
  - [x] 编写错误处理单元测试

### Phase 6: 高级特性 (Advanced Features) ✅

**目标**: 实现 WebSocket、文件上传、性能优化等高级特性

- [x] WebSocket 支持 ✅
  - [x] 实现 WebSocket 装饰器
  - [x] 实现 WebSocket 网关与注册表
  - [x] 支持应用级 WebSocket 管理与升级
  - [x] 编写 WebSocket 注册表测试

- [x] 文件处理 ✅
  - [x] 实现文件上传中间件
  - [x] 实现文件下载支持
  - [x] 实现静态文件服务
  - [x] 编写文件处理测试

- [x] 性能优化
  - [x] 路由匹配性能优化（静态路由缓存 + O(1) 查找）
  - [x] 依赖注入性能优化（DependencyPlan 缓存，避免重复反射与类型推断）
  - [x] 中间件管道优化（预先构建 next 链并校验重复 next 调用）
  - [x] 性能基准与压力测试（PerformanceHarness、StressTester）

### Phase 7: 文档和示例 (Documentation)

**目标**: 完善文档、示例和最佳实践

- [x] 文档编写
  - [x] 编写 API 文档（`docs/api.md`）
  - [x] 编写使用指南（`docs/guide.md`）
  - [x] 编写最佳实践文档（`docs/best-practices.md`）
  - [x] 编写迁移指南（`docs/migration.md`）

- [x] 示例项目
  - [x] 创建基础示例项目（`examples/basic-app.ts`）
  - [x] 创建完整示例项目（`examples/full-app.ts`）
  - [x] 创建性能测试示例（`examples/perf/app.ts`）
  - [x] 完善 README（`examples/README.md`）

### Phase 8: 测试和优化 (Testing & Polish) ✅

**目标**: 完善测试覆盖、修复 bug、性能调优

- [x] 测试完善
  - [x] 提高测试覆盖率 (>90%，引入 Router Decorator、ResponseBuilder、BodyParser
        等补充测试)
  - [x] 编写集成测试（新增模块化、静态文件、日志链路补充用例）
  - [x] 编写性能测试（PerformanceHarness + Router benchmark）
  - [x] 编写压力测试（StressTester + DI 并发验证）

- [x] 优化和修复
  - [x] 修复已知 bug（修复静态路由遍历性能瓶颈与日志状态码不一致问题）
  - [x] 性能优化（静态路由缓存、测试/压力工具)
  - [x] 代码重构（Router 内部缓存结构、测试工具抽象）
  - [x] 代码审查（新增覆盖率报告 & README 更新）

## 里程碑

- **Milestone 1**: 基础 HTTP 服务器和路由系统可用
- **Milestone 2**: 依赖注入系统完整可用
- **Milestone 3**: 中间件系统完整可用
- **Milestone 4**: 核心功能完整，可构建简单应用
- **Milestone 5**: 高级特性完成，框架功能完整
- **Milestone 6**: 框架稳定，可用于生产环境

## 文档与示例

- 文档
  - [API 文档](docs/api.md)
  - [使用指南](docs/guide.md)
  - [最佳实践](docs/best-practices.md)
  - [迁移指南](docs/migration.md)
- 示例
  - [基础示例](examples/basic-app.ts)
  - [综合示例](examples/full-app.ts)
  - [性能示例](examples/perf/app.ts)
  - [示例说明](examples/README.md)

## 设计原则

1. **类型优先**: 充分利用 TypeScript 的类型系统，提供完整的类型支持
2. **装饰器驱动**: 使用装饰器简化 API，提供优雅的代码风格
3. **性能优先**: 充分利用 Bun 的性能优势，避免不必要的开销
4. **可扩展性**: 设计灵活的架构，支持插件和扩展
5. **开发体验**: 提供清晰的错误信息和优秀的开发工具支持

## 参考项目

- **NestJS**: 依赖注入和装饰器设计参考
- **Fastify**: 高性能路由设计参考
- **Koa**: 中间件设计参考
- **Express**: 简洁 API 设计参考

## 贡献指南

欢迎贡献代码、提出建议或报告问题。请确保：

- 代码遵循项目规范
- 包含必要的测试
- 更新相关文档

## 许可证

待定
