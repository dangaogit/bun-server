# 故障排查指南

本文档帮助你在使用 Bun Server Framework 时诊断和解决常见问题。

## 目录

- [常见问题](#常见问题)
- [模块注册](#模块注册)
- [依赖注入](#依赖注入)
- [路由问题](#路由问题)
- [性能问题](#性能问题)
- [调试技巧](#调试技巧)

## 常见问题

### Provider 未找到

**错误**：`Provider not found for token: Symbol(...)`

**原因**：模块的 `forRoot()` 方法在 `Application`
实例创建之前被调用，或者模块未通过 `app.registerModule()` 注册。

**解决方案**：

```typescript
// ❌ Wrong: Module.forRoot() before Application
ConfigModule.forRoot({ defaultConfig: {} });
const app = new Application({ port: 3000 });

// ✅ Correct: Module.forRoot() before Application, then register
ConfigModule.forRoot({ defaultConfig: {} });
const app = new Application({ port: 3000 });
app.registerModule(ConfigModule);
```

### 模块元数据未清除

**错误**：测试失败，提示 "Module already registered" 或测试中出现意外行为。

**原因**：模块元数据在测试之间持续存在。

**解决方案**：在 `beforeEach` 中清除模块元数据：

```typescript
import { MODULE_METADATA_KEY } from "../../src/di/module";

beforeEach(() => {
  Reflect.deleteMetadata(MODULE_METADATA_KEY, YourModule);
});
```

### 端口已被使用

**错误**：`Error: listen EADDRINUSE: address already in use`

**原因**：另一个进程正在使用该端口，或者之前的测试未清理。

**解决方案**：在测试中使用 `getTestPort()` 工具：

```typescript
import { getTestPort } from "../utils/test-port";

const port = getTestPort();
const app = new Application({ port });
```

## 模块注册

### 模块顺序很重要

模块应按依赖顺序注册。如果 `AppModule` 依赖于 `ConfigModule`，请先注册
`ConfigModule`：

```typescript
ConfigModule.forRoot({ defaultConfig: {} });
CacheModule.forRoot({ defaultTtl: 60000 });
const app = new Application({ port: 3000 });
app.registerModule(ConfigModule);
app.registerModule(CacheModule);
app.registerModule(AppModule);
```

### 循环依赖

**错误**：检测到循环依赖或模块初始化期间出现无限循环。

**解决方案**：重构模块以移除循环依赖，或使用延迟加载：

```typescript
// Use dynamic import for circular dependencies
const { SomeService } = await import("./some-service");
```

## 依赖注入

### ⚠️ 重要：注入的依赖为 undefined

**错误**：注入的服务在运行时为 `undefined`，或通过 `bun app.ts` 运行正常，但在 VSCode 调试器中失败。

**原因**：`tsconfig.json` 中缺少 TypeScript 装饰器元数据配置。

**解决方案**：**这非常重要！** 确保你的 `tsconfig.json` 包含以下两个选项：

```json
{
  "compilerOptions": {
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true
  }
}
```

**为什么重要**：
- `emitDecoratorMetadata`：使 TypeScript 能够为装饰器发出元数据，这是依赖注入正常工作所必需的
- `experimentalDecorators`：启用装饰器语法支持
- 没有这些配置，DI 容器无法确定参数类型，将注入 `undefined`

**检查所有 tsconfig.json 文件**：
- 根目录的 `tsconfig.json`
- `examples/tsconfig.json`
- 任何项目特定的 `tsconfig.json` 文件

**示例**：
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "./",
    "emitDecoratorMetadata": true,  // ⚠️ 必需
    "experimentalDecorators": true   // ⚠️ 必需
  },
  "include": ["**/*.ts"]
}
```

### 服务不可注入

**错误**：`Cannot resolve dependency` 或找不到服务。

**解决方案**：确保服务使用 `@Injectable()` 装饰器：

```typescript
@Injectable()
class UserService {
  // ...
}
```

### Token 未找到

**错误**：`Provider not found for token`

**解决方案**：确保 token 从模块中导出且模块已注册：

```typescript
// In module
@Module({
  providers: [
    { provide: MY_TOKEN, useValue: myService },
  ],
  exports: [MY_TOKEN],
})
class MyModule {}
```

## 路由问题

### 路由未找到 (404)

**可能原因**：

1. 控制器未注册
2. 路由路径不匹配
3. HTTP 方法不匹配

**解决方案**：

```typescript
// Ensure controller is registered
@Module({
  controllers: [UserController],
})
class AppModule {}

// Check route path
@Controller("/api/users")
class UserController {
  @GET("/:id") // Matches /api/users/:id
  public getUser(@Param("id") id: string) {}
}
```

### 参数未绑定

**错误**：`@Param('id')` 返回 `undefined`

**解决方案**：确保参数名称与路由参数匹配：

```typescript
// Route: /api/users/:id
@GET('/:id')
public getUser(@Param('id') id: string) {  // ✅ Correct
  // ...
}

@GET('/:id')
public getUser(@Param('userId') userId: string) {  // ❌ Wrong
  // ...
}
```

## 性能问题

### 请求处理缓慢

**可能原因**：

1. 请求处理程序中的重计算
2. 同步阻塞操作
3. 大型响应负载

**解决方案**：

```typescript
// Use async/await for I/O operations
@GET('/users')
public async getUsers() {
  return await this.userService.findAll();  // ✅ Async
}

// Avoid blocking operations
@GET('/users')
public getUsers() {
  return this.userService.findAllSync();  // ❌ Blocking
}
```

### 内存泄漏

**症状**：内存使用量随时间增加。

**可能原因**：

1. 事件监听器未清理
2. 定时器/间隔未清除
3. 缓存未过期

**解决方案**：

```typescript
// Clean up in afterEach/afterAll
afterEach(async () => {
  await app.stop();
  ModuleRegistry.getInstance().clear();
});

// Use TTL for cache
CacheModule.forRoot({
  defaultTtl: 3600000, // 1 hour
});
```

## 调试技巧

### 启用调试日志

将日志级别设置为 `DEBUG`：

```typescript
LoggerModule.forRoot({
  logger: {
    level: LogLevel.DEBUG,
  },
});
```

### 检查模块元数据

检查模块元数据：

```typescript
import { MODULE_METADATA_KEY } from "../../src/di/module";

const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, YourModule);
console.log("Module metadata:", metadata);
```

### 验证容器状态

检查容器中注册的内容：

```typescript
const container = app.getContainer();
// Inspect container internals (implementation-dependent)
```

### 使用测试工具

使用测试工具进行一致的测试设置：

```typescript
import { getTestPort } from "../utils/test-port";

const port = getTestPort();
const app = new Application({ port });
```

## 获取帮助

如果仍然遇到问题：

1. 查看 [API 文档](./api.md)
2. 查看 [示例](../examples/)
3. 搜索现有的 [GitHub Issues](https://github.com/your-repo/issues)
4. 创建新 issue，包含：
   - Bun 版本
   - 框架版本
   - 最小复现代码
   - 错误消息和堆栈跟踪
