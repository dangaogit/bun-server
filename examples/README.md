# Bun Server Framework - 示例索引

本目录包含 Bun Server Framework 的完整示例代码，按难度和功能分类组织。

## 📚 目录结构

```
examples/
├── 00-quick-start/          # 快速入门（5 分钟上手）
├── 01-core-features/        # 核心功能（深入理解框架）
├── 02-official-modules/     # 官方模块（开箱即用）
├── 03-advanced/             # 高级功能（进阶技巧）
└── 04-real-world/           # 实战案例（生产级示例）
```

## 🚀 快速开始

### 推荐学习路径

1. **初学者** → 从 `00-quick-start` 开始
2. **有经验的开发者** → 直接查看 `02-official-modules` 或 `04-real-world`
3. **框架贡献者** → 参考 `03-advanced` 了解高级特性

---

## 📂 分类详情

### 00. 快速入门 (Quick Start)

**适合人群**：完全没有使用过 Bun Server 的开发者

| 文件 | 说明 | 难度 | 运行端口 |
|------|------|------|---------|
| `hello-world.ts` | 最简示例：5 行代码启动 HTTP 服务器 | ⭐ | 3000 |
| `basic-routing.ts` | 路由系统基础：定义 GET/POST/PUT/DELETE 路由 | ⭐ | 3000 |
| `dependency-injection.ts` | DI 基础：使用 `@Injectable` 和构造函数注入 | ⭐⭐ | 3100 |

**运行方式**：
```bash
bun run examples/00-quick-start/hello-world.ts
```

---

### 01. 核心功能 (Core Features)

**适合人群**：想深入理解框架核心机制的开发者

| 文件 | 说明 | 难度 | 端口 |
|------|------|------|------|
| `basic-app.ts` | 综合示例：DI + Logger + Swagger + Config | ⭐⭐ | 3100 |
| `multi-module-app.ts` | 模块系统：模块间依赖、导入导出 | ⭐⭐⭐ | 3300 |
| `basic-router.ts` | 底层路由：直接使用 RouteRegistry | ⭐⭐ | 3000 |
| `context-scope-app.ts` | 请求作用域：ContextService 和 Scoped 生命周期 | ⭐⭐⭐ | 3500 |
| `full-app.ts` | 完整功能：验证、上传、静态文件、WebSocket | ⭐⭐⭐ | 3200 |

**核心概念**：
- **依赖注入**：`@Injectable`、构造函数注入、Symbol Token
- **模块系统**：`@Module`、imports/providers/exports
- **中间件**：全局/控制器/方法级中间件
- **生命周期**：Singleton vs Scoped

---

### 02. 官方模块 (Official Modules)

**适合人群**：需要快速集成特定功能的开发者

#### 🔐 认证与安全

| 文件 | 说明 | 核心功能 | 端口 |
|------|------|----------|------|
| `auth-app.ts` | SecurityModule：JWT + OAuth2 完整示例 | 登录、令牌刷新、权限控制 | 3000 |
| `session-app.ts` | SessionModule：Session 管理 | 登录状态、购物车 | 3400 |

**关键点**：
- **JWT 认证**：访问令牌、刷新令牌、令牌过期
- **OAuth2**：授权码模式、令牌交换
- **权限控制**：`@Auth()` 装饰器、角色验证
- **Session**：Cookie 管理、Session 存储

#### 📊 数据与缓存

| 文件 | 说明 | 核心功能 | 端口 |
|------|------|----------|------|
| `database-app.ts` | DatabaseModule：SQLite 数据库 | 连接管理、查询、健康检查 | 3000 |
| `orm-app.ts` | ORM：Entity + Repository 模式 | 实体定义、CRUD 操作 | 3000 |
| `cache-app.ts` | CacheModule：缓存管理 | `@Cacheable`、`@CacheEvict`、`@CachePut` | 3200 |
| `transaction-app.ts` | 事务管理：数据一致性 | `@Transactional` 装饰器 | 3000 |

**关键点**：
- **数据库**：连接池、参数化查询、健康检查
- **ORM**：实体映射、关系管理、Repository 模式
- **缓存**：装饰器缓存、手动缓存、TTL 策略
- **事务**：ACID 保证、回滚机制

#### ⚙️ 后台任务

| 文件 | 说明 | 核心功能 | 端口 |
|------|------|----------|------|
| `queue-app.ts` | QueueModule：任务队列 | 任务调度、Cron 定时任务 | 3300 |

**关键点**：
- **任务队列**：异步任务、优先级队列
- **定时任务**：Cron 表达式、周期执行
- **任务处理器**：注册处理器、错误处理

#### 📈 监控与文档

| 文件 | 说明 | 核心功能 | 端口 |
|------|------|----------|------|
| `metrics-rate-limit-app.ts` | 监控与限流 | Prometheus 指标、API 限流 | 3000 |

**运行方式**：
```bash
# 认证示例（包含 Web UI）
bun run examples/auth-app.ts
# 访问 http://localhost:3000

# 缓存示例
bun run examples/cache-app.ts

# 队列示例
bun run examples/queue-app.ts
```

---

### 03. 高级功能 (Advanced)

**适合人群**：需要自定义框架行为的高级开发者

| 文件 | 说明 | 核心技术 | 端口 |
|------|------|----------|------|
| `custom-decorator-app.ts` | 自定义装饰器：@Timing 示例 | Metadata、Interceptor | 3000 |
| `advanced-decorator-app.ts` | 高级装饰器：多装饰器组合 | 装饰器链、优先级 | 3000 |
| `microservice-app.ts` | 微服务架构：服务间通信 | Nacos、配置中心 | 多端口 |

**关键点**：
- **自定义装饰器**：Metadata API、Reflect
- **拦截器**：InterceptorRegistry、执行顺序
- **微服务**：服务发现、配置管理、负载均衡

**示例：创建自定义装饰器**
```typescript
// 1. 定义 Metadata Key
const TIMING_KEY = Symbol('@timing');

// 2. 创建装饰器
export function Timing(options: TimingOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    Reflect.defineMetadata(TIMING_KEY, options, target, propertyKey);
  };
}

// 3. 实现拦截器
class TimingInterceptor implements Interceptor {
  async execute(...) {
    const start = performance.now();
    const result = await originalMethod.apply(target, args);
    console.log(`执行时间: ${performance.now() - start}ms`);
    return result;
  }
}

// 4. 注册拦截器
registry.register(TIMING_KEY, new TimingInterceptor(), 100);

// 5. 使用装饰器
@GET('/users')
@Timing({ label: '获取用户列表' })
public getUsers() { ... }
```

---

### 04. 实战案例 (Real World)

**适合人群**：需要生产级代码参考的开发者

| 目录 | 说明 | 技术栈 |
|------|------|--------|
| `database-test-app.ts` | 数据库连接测试工具 | Web UI、多数据库支持 |
| `perf/app.ts` | 性能压测基准 | 高并发、性能优化 |

**运行方式**：
```bash
# 数据库测试工具（Web UI）
bun run examples/database-test-app.ts
# 访问 http://localhost:3000

# 性能压测
bun run examples/perf/app.ts
wrk -t4 -c64 -d30s http://localhost:3300/api/ping
```

---

## 🎯 按场景查找示例

### 场景 1: 我想快速搭建一个 RESTful API

1. 从 `basic-app.ts` 开始，了解基本结构
2. 参考 `auth-app.ts` 添加认证
3. 使用 `cache-app.ts` 优化性能
4. 查看 `database-app.ts` 连接数据库

### 场景 2: 我想实现用户认证系统

1. 查看 `auth-app.ts`（JWT + OAuth2）
2. 参考 `session-app.ts`（Session 管理）
3. 了解 `@Auth()` 装饰器用法

### 场景 3: 我想使用队列处理异步任务

1. 查看 `queue-app.ts`（任务队列 + Cron）
2. 了解任务处理器注册
3. 学习 Cron 表达式

### 场景 4: 我想自定义框架行为

1. 参考 `custom-decorator-app.ts`（自定义装饰器）
2. 了解 `advanced-decorator-app.ts`（装饰器组合）
3. 学习 Interceptor 机制

---

## 💡 重要概念说明

### Symbol + Interface 同名模式

这是本项目的特色设计，解决了 TypeScript 编译后无类型信息的问题：

```typescript
// 1. 定义接口
interface UserService {
  find(id: string): Promise<User | undefined>;
}

// 2. 定义同名 Symbol（注意：不要用 import type）
const UserService = Symbol('UserService');

// 3. 实现接口
@Injectable()
class UserServiceImpl implements UserService {
  public async find(id: string) { ... }
}

// 4. 在 Module 中配置
@Module({
  providers: [{
    provide: UserService,      // Symbol token
    useClass: UserServiceImpl, // 实现类
  }],
  exports: [UserServiceImpl],  // 导出实现类
})

// 5. 注入使用
public constructor(
  // 类型是 interface，注入的是 Symbol 对应的实现
  private readonly userService: UserService,
) {}
```

**关键点**：
- ✅ 使用 `import { UserService }`（导入 Symbol + interface）
- ❌ **不要**用 `import type { UserService }`（只导入类型，丢失 Symbol）

### 默认构造函数注入

框架支持无装饰器的构造函数注入（推荐方式）：

```typescript
// ✅ 推荐：直接指定类型
public constructor(
  private readonly userService: UserService,
  private readonly productService: ProductService,
) {}

// ⚠️ 仅在使用 Symbol Token 时需要
public constructor(
  @Inject(USER_SERVICE_TOKEN) private readonly userService: UserService,
  @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
) {}
```

---

## 🔧 常见问题

### Q1: 示例运行失败，提示端口被占用？

**A**: 使用环境变量指定端口：
```bash
PORT=4000 bun run examples/basic-app.ts
```

### Q2: 依赖注入返回 `undefined`？

**A**: 检查以下几点：
1. `tsconfig.json` 中是否启用了 `emitDecoratorMetadata` 和 `experimentalDecorators`
2. 是否使用了 `import type`（Symbol Token 不能用 import type）
3. 服务是否在 Module 的 `providers` 中注册

### Q3: Symbol + Interface 模式什么时候用？

**A**: 以下场景推荐使用：
- 需要面向接口编程（便于测试和替换实现）
- 有多个实现类（使用不同的 Symbol 区分）
- 需要导出接口而非实现类

### Q4: 如何调试示例代码？

**A**: 使用 Bun 的调试功能：
```bash
bun --inspect-brk examples/basic-app.ts
```

---

## 📖 进一步学习

- 📚 [API 文档](../docs/api.md)
- 🎓 [使用指南](../docs/guide.md)
- 🏆 [最佳实践](../docs/best-practices.md)
- 🐛 [故障排查](../docs/troubleshooting.md)
- 🔒 [错误处理](../docs/error-handling.md)

---

## 🤝 贡献示例

欢迎贡献更多示例！提交前请确保：

1. ✅ 代码遵循项目规范（查看 `.cursor/rules/code-style.mdc`）
2. ✅ 添加清晰的注释（中英文）
3. ✅ 在本 README 中添加索引
4. ✅ 测试示例可正常运行

---

**Happy Coding! 🎉**
