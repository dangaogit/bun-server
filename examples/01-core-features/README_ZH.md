# 核心功能示例

**中文** | [English](./README.md)

本目录包含 Bun Server Framework 核心功能的示例代码，帮助你深入理解框架的核心机制。

## 📚 示例列表

| 文件 | 说明 | 核心概念 | 难度 | 端口 |
|------|------|----------|------|------|
| `basic-app.ts` | 综合示例：DI + Logger + Swagger + Config | 依赖注入、模块系统、日志、API 文档 | ⭐⭐ | 3100 |
| `multi-module-app.ts` | 模块系统：模块间依赖、导入导出 | 模块依赖、服务共享、模块组织 | ⭐⭐⭐ | 3300 |
| `basic-router.ts` | 底层路由：直接使用 RouteRegistry | 路由注册、路径参数、Context | ⭐⭐ | 3000 |
| `context-scope-app.ts` | 请求作用域：ContextService 和 Scoped 生命周期 | Scoped 生命周期、ContextService | ⭐⭐⭐ | 3500 |
| `full-app.ts` | 完整功能：验证、上传、静态文件、WebSocket | 中间件、文件上传、WebSocket | ⭐⭐⭐ | 3200 |

## 🎯 学习路径

### 1. 基础入门
从 `basic-app.ts` 开始，了解：
- ✅ 依赖注入基础（`@Injectable`、构造函数注入）
- ✅ 模块系统（`@Module`、imports/providers/exports）
- ✅ 日志集成（LoggerModule）
- ✅ API 文档（SwaggerModule）
- ✅ 配置管理（ConfigModule）

**运行**：
```bash
bun run examples/01-core-features/basic-app.ts
```

**访问**：
- API: http://localhost:3100/api/users
- Swagger UI: http://localhost:3100/swagger

### 2. 模块系统深入
学习 `multi-module-app.ts`：
- ✅ 模块间依赖（UserModule → ProductModule → OrderModule）
- ✅ 服务导入导出
- ✅ 跨模块依赖注入
- ✅ 模块组织最佳实践

**运行**：
```bash
bun run examples/01-core-features/multi-module-app.ts
```

**测试**：
```bash
# 创建订单（依赖 User 和 Product）
curl -X POST http://localhost:3300/api/orders \
  -H "Content-Type: application/json" \
  -d '{"userId":"1","productId":"1","quantity":2}'
```

### 3. 底层路由机制
学习 `basic-router.ts`：
- ✅ 直接使用 RouteRegistry
- ✅ 手动注册路由
- ✅ Context 对象使用
- ✅ 无装饰器的路由定义

**适合场景**：需要动态注册路由、或不想使用装饰器

### 4. 请求作用域
学习 `context-scope-app.ts`：
- ✅ `Lifecycle.Scoped` 生命周期
- ✅ ContextService 的使用
- ✅ 请求级别的依赖隔离
- ✅ `@ContextParam()` 装饰器

**关键概念**：
```typescript
// Scoped 服务：每个请求一个实例
@Injectable({ lifecycle: Lifecycle.Scoped })
class RequestIdService {
  public readonly requestId: string = crypto.randomUUID();
}

// 在服务层访问当前请求的 Context
@Injectable()
class UserAgentService {
  constructor(
    @Inject(CONTEXT_SERVICE_TOKEN)
    private readonly contextService: ContextService
  ) {}
  
  getUserAgent() {
    return this.contextService.getHeader('User-Agent');
  }
}
```

### 5. 完整功能集成
学习 `full-app.ts`：
- ✅ 中间件（CORS、日志、文件上传、静态文件）
- ✅ 输入验证（`@Validate` 装饰器）
- ✅ 文件上传处理
- ✅ WebSocket 集成

**运行**：
```bash
bun run examples/01-core-features/full-app.ts
```

**测试**：
```bash
# 1. 搜索接口（带验证）
curl http://localhost:3200/api/search?q=test
curl http://localhost:3200/api/search?q=a   # 验证失败（最少 2 个字符）

# 2. 邮件订阅（需要认证 + 邮件验证）
curl -X POST http://localhost:3200/api/newsletter/subscribe \
  -H "Authorization: demo-token" \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# 3. 文件上传
echo "test content" > /tmp/test.txt
curl -X POST http://localhost:3200/api/files/upload \
  -F "file=@/tmp/test.txt"

# 4. 静态文件（先创建目录和文件）
mkdir -p ./public
echo "Hello from static file" > ./public/test.txt
curl http://localhost:3200/assets/test.txt

# 5. WebSocket 聊天
# 使用 websocat: websocat ws://localhost:3200/ws/chat
# 或使用浏览器控制台：
ws = new WebSocket('ws://localhost:3200/ws/chat')
ws.onmessage = (e) => console.log('收到:', e.data)
ws.send('Hello')
```

**核心特性**：
- **中间件管道**：多个中间件协同工作
- **验证**：声明式输入验证
- **文件处理**：上传和静态文件服务
- **配置驱动**：所有设置来自 ConfigModule

## 💡 核心概念详解

### 依赖注入（DI）

**基本用法**：
```typescript
// 1. 定义服务
@Injectable()
class UserService {
  findAll() { return []; }
}

// 2. 注入服务
@Controller('/users')
class UserController {
  constructor(
    private readonly userService: UserService  // 自动注入
  ) {}
}

// 3. 注册到容器
@Module({
  providers: [UserService],
  controllers: [UserController],
})
class UserModule {}
```

**Symbol + Interface 模式**：
```typescript
// 定义接口和同名 Symbol
interface UserService {
  findAll(): Promise<User[]>;
}
const UserService = Symbol('UserService');

// 实现类
@Injectable()
class UserServiceImpl implements UserService {
  async findAll() { return []; }
}

// 模块配置
@Module({
  providers: [{
    provide: UserService,      // Symbol Token
    useClass: UserServiceImpl, // 实现类
  }],
})
```

详见：[Symbol + Interface 模式详解](../../docs/symbol-interface-pattern.md)

### 模块系统

**模块组织**：
```typescript
@Module({
  imports: [SharedModule],     // 导入其他模块
  controllers: [UserController], // 控制器
  providers: [UserService],     // 服务
  exports: [UserService],       // 导出服务供其他模块使用
})
class UserModule {}
```

**模块依赖**：
```typescript
// OrderModule 依赖 UserModule 和 ProductModule
@Module({
  imports: [UserModule, ProductModule],
  controllers: [OrderController],
  providers: [OrderService],
})
class OrderModule {}
```

### 中间件

**全局中间件**：
```typescript
app.use(createLoggerMiddleware({ prefix: '[App]' }));
app.use(createCorsMiddleware({ origin: '*' }));
```

**控制器级中间件**：
```typescript
@Controller('/api')
@UseMiddleware(authMiddleware)
class ApiController {}
```

**方法级中间件**：
```typescript
@GET('/admin')
@UseMiddleware(adminOnlyMiddleware)
public admin() {}
```

### 生命周期

| 生命周期 | 说明 | 使用场景 |
|---------|------|---------|
| `Singleton` | 单例（默认） | 无状态服务、配置、工具类 |
| `Transient` | 每次创建新实例 | 有状态服务、临时对象 |
| `Scoped` | 请求作用域 | 请求级别的数据隔离 |

```typescript
@Injectable({ lifecycle: Lifecycle.Scoped })
class RequestLogger {
  private readonly requestId = crypto.randomUUID();
}
```

## 🔧 常见问题

### Q1: 模块间如何共享服务？

**A**: 使用 `exports` 导出服务：
```typescript
// UserModule 导出 UserService
@Module({
  providers: [UserService],
  exports: [UserService],
})
class UserModule {}

// OrderModule 导入 UserModule
@Module({
  imports: [UserModule],  // 现在可以注入 UserService
  controllers: [OrderController],
})
class OrderModule {}
```

### Q2: Scoped 生命周期如何工作？

**A**: 每个请求创建新的服务实例，请求结束后自动销毁：
```typescript
@Injectable({ lifecycle: Lifecycle.Scoped })
class RequestIdService {
  readonly id = crypto.randomUUID();
}

// 同一请求内多次注入，返回同一个实例
// 不同请求，返回不同实例
```

### Q3: 如何访问当前请求的 Context？

**A**: 三种方式：
```typescript
// 1. 参数注入
@GET('/:id')
public getUser(@ContextParam() context: Context) {}

// 2. ContextService（推荐在服务层使用）
@Injectable()
class UserService {
  constructor(
    @Inject(CONTEXT_SERVICE_TOKEN)
    private readonly contextService: ContextService
  ) {}
  
  getUserAgent() {
    return this.contextService.getHeader('User-Agent');
  }
}

// 3. 中间件中直接访问
async (ctx: Context, next: NextFunction) => {
  console.log(ctx.path);
  return await next();
}
```

## 📖 进一步学习

- 📚 [API 文档](../../docs/api.md)
- 🎓 [使用指南](../../docs/guide.md)
- 🏆 [最佳实践](../../docs/best-practices.md)
- 🔑 [Symbol + Interface 模式](../../docs/symbol-interface-pattern.md)

## ⬅️ 返回

[← 返回示例索引](../README.md)
