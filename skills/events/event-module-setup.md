# EventModule 配置和初始化问题

## 问题描述

在使用 EventModule 时，应用启动后访问接口报错：

```
Provider not found for token: Symbol(@dangao/bun-server:events:emitter)
```

## 错误信息示例

```typescript
// 错误堆栈
Error: Provider not found for token: Symbol(@dangao/bun-server:events:emitter)
    at resolveInternal (/path/to/node_modules/@dangao/bun-server/dist/index.js:651:24)
    at resolve (/path/to/node_modules/@dangao/bun-server/dist/index.js:616:34)
    at instantiate (/path/to/node_modules/@dangao/bun-server/dist/index.js:710:51)
    ...
```

## 问题场景

当你的代码中有以下情况时会出现此错误：

1. **在服务中注入 EventEmitter**：

```typescript
@Injectable()
export class MyService {
  constructor(
    @Inject(EVENT_EMITTER_TOKEN) private readonly eventEmitter: EventEmitter,
  ) {}
}
```

2. **在模块中导入了 EventModule**：

```typescript
@Module({
  imports: [EventModule], // ❌ 错误：没有调用 forRoot()
  providers: [MyService],
})
export class AppModule {}
```

3. **使用了 @OnEvent 装饰器**：

```typescript
@Injectable()
export class MyListener {
  @OnEvent("my.event")
  handleEvent(payload: any) {
    // ...
  }
}
```

## 问题原因

EventModule 需要**两步配置**才能正常工作，缺一不可：

### 原因 1：没有调用 `EventModule.forRoot()`

`EventModule.forRoot()` 的作用：

- 创建 `EventEmitterService` 实例
- 将 `EVENT_EMITTER_TOKEN` 注册到 DI 容器
- 导出 `EVENT_EMITTER_TOKEN` 供其他模块使用

**如果不调用 `forRoot()`，DI 容器中就没有 `EVENT_EMITTER_TOKEN`
的提供者**，导致依赖注入失败。

### 原因 2：没有初始化事件监听器

即使调用了 `forRoot()`，如果使用了 `@OnEvent` 装饰器，还需要调用
`EventModule.initializeListeners()` 来扫描和注册监听器。

## 解决方案

### 步骤 1：在模块中调用 `forRoot()`

```typescript
// ✅ 正确
@Module({
  imports: [
    EventModule.forRoot({
      wildcard: true, // 启用通配符事件（可选）
      maxListeners: 20, // 最大监听器数量（可选）
      onError: (error, event, payload) => {
        console.error(`Event error:`, error);
      },
    }),
  ],
  providers: [MyService, MyListener],
})
export class AppModule {}
```

**注意**：

- `forRoot()` 必须在模块定义之前调用（如果子模块需要导入 EventModule）
- 配置参数都是可选的，可以传空对象：`EventModule.forRoot({})`

### 步骤 2：在启动时初始化事件监听器

如果使用了 `@OnEvent` 装饰器，需要在 `app.registerModule()` 之后初始化：

```typescript
import { Application, EventModule, ModuleRegistry } from "@dangao/bun-server";
import { AppModule } from "./app.module";
import { MyListener } from "./my-listener";

const app = new Application({ port: 3000 });

// 注册应用模块
app.registerModule(AppModule);

// 初始化事件监听器（必须在 registerModule 之后）
const rootModuleRef = ModuleRegistry.getInstance().getModuleRef(AppModule);
if (rootModuleRef?.container) {
  EventModule.initializeListeners(
    rootModuleRef.container,
    [MyListener], // 所有使用 @OnEvent 的监听器类
  );
  console.log("✓ Event listeners initialized");
}

app.listen();
```

**关键点**：

- 必须在 `app.registerModule()` 之后调用
- 传入根模块的容器（`rootModuleRef.container`）
- 第二个参数是所有使用 `@OnEvent` 装饰器的监听器类数组

## 完整示例

### 错误示例 ❌

```typescript
// app.module.ts
@Module({
  imports: [
    EventModule, // ❌ 没有调用 forRoot()
  ],
  providers: [UserService, NotificationListener],
})
export class AppModule {}

// index.ts
const app = new Application({ port: 3000 });
app.registerModule(AppModule);
// ❌ 没有初始化监听器
app.listen();
```

### 正确示例 ✅

```typescript
// app.module.ts
@Module({
  imports: [
    EventModule.forRoot({
      wildcard: true,
      maxListeners: 20,
    }), // ✅ 调用 forRoot()
  ],
  providers: [UserService, NotificationListener],
})
export class AppModule {}

// index.ts
import { Application, EventModule, ModuleRegistry } from "@dangao/bun-server";
import { AppModule } from "./app.module";
import { NotificationListener } from "./notification-listener";

const app = new Application({ port: 3000 });

// 注册模块
app.registerModule(AppModule);

// ✅ 初始化事件监听器
const rootModuleRef = ModuleRegistry.getInstance().getModuleRef(AppModule);
if (rootModuleRef?.container) {
  EventModule.initializeListeners(
    rootModuleRef.container,
    [NotificationListener],
  );
}

app.listen();
```

## 模块化架构中的特殊情况

如果你的应用采用了模块化架构（将功能拆分到多个模块），需要注意：

### 配置顺序很重要

```typescript
// ⚠️ 重要：必须在子模块定义之前配置
EventModule.forRoot({ wildcard: true });

// 然后定义使用 EventModule 的子模块
@Module({
  imports: [EventModule], // 子模块导入已配置的 EventModule
  providers: [UserService],
})
class UserModule {}

@Module({
  imports: [UserModule, NotificationModule],
})
class AppModule {}
```

### 推荐做法

1. **在文件顶部配置所有需要 `forRoot()` 的模块**：

```typescript
// 在所有模块定义之前配置
EventModule.forRoot({ wildcard: true });
LoggerModule.forRoot({ level: LogLevel.INFO });
ConfigModule.forRoot({ defaultConfig: {} });

// 然后定义模块
@Module({ imports: [EventModule] })
class UserModule {}
```

2. **集中初始化所有监听器**：

```typescript
// 在 index.ts 中集中初始化
EventModule.initializeListeners(
  rootModuleRef.container,
  [
    NotificationListener,
    AnalyticsListener,
    AuditListener,
    // ... 所有监听器类
  ],
);
```

## 检查清单

使用 EventModule 前，确保：

- [ ] 在模块 `imports` 中调用了 `EventModule.forRoot()`
- [ ] 如果使用了 `@OnEvent` 装饰器，在 `index.ts` 中调用了
      `EventModule.initializeListeners()`
- [ ] 初始化监听器时传入了正确的容器（根模块的容器）
- [ ] 初始化监听器时列出了所有使用 `@OnEvent` 的监听器类
- [ ] 在模块化架构中，确保配置顺序正确（先 `forRoot()`，后定义模块）

## 相关文档

- [事件系统文档](../../docs/events.md)
- [EventModule API 文档](../../docs/api/event-module.md)
- [完整示例：events-app.ts](../../examples/02-official-modules/events-app.ts)
- [模块化示例：events-module-based-app.ts](../../examples/02-official-modules/events-module-based-app.ts)

## 常见问题 FAQ

### Q1: 为什么需要两步配置？

A: 分为两步是因为：

1. `forRoot()` 注册服务到 DI 容器（编译时配置）
2. `initializeListeners()` 扫描和注册装饰器方法（运行时注册）

### Q2: 可以不使用 `@OnEvent` 装饰器吗？

A: 可以。如果直接使用 `eventEmitter.on()` 方法注册监听器，就不需要调用
`initializeListeners()`：

```typescript
@Injectable()
export class MyService {
  constructor(
    @Inject(EVENT_EMITTER_TOKEN) private readonly eventEmitter: EventEmitter,
  ) {
    // 直接注册监听器
    this.eventEmitter.on("my.event", this.handleEvent.bind(this));
  }

  handleEvent(payload: any) {
    // ...
  }
}
```

### Q3: 子模块需要调用 `forRoot()` 吗？

A: 不需要。`forRoot()` 只在根模块或最顶层调用一次。子模块只需要导入
`EventModule`：

```typescript
@Module({
  imports: [EventModule], // 子模块直接导入即可
  providers: [UserService],
})
class UserModule {}
```

### Q4: 如何调试 EventModule 问题？

A: 添加日志检查：

```typescript
const rootModuleRef = ModuleRegistry.getInstance().getModuleRef(AppModule);
console.log("Root module container:", rootModuleRef?.container);

// 尝试手动解析 EventEmitter
try {
  const emitter = rootModuleRef?.container.resolve(EVENT_EMITTER_TOKEN);
  console.log("EventEmitter resolved:", emitter);
} catch (error) {
  console.error("Failed to resolve EventEmitter:", error);
}
```

## 更新历史

- 2026-02-02: 初始版本，记录 EventModule 配置问题及解决方案
