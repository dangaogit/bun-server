# 依赖注入不工作（必须使用 @Inject）

## 问题描述

在使用 bun-server 框架时，Controller 或 Service
的构造函数依赖注入不工作，必须显式添加 `@Inject()` 装饰器才能正常注入依赖。

## 错误信息示例

```
Error: Cannot resolve dependency at index 0 of OpenIMWebhookController.
Parameter type is undefined. Use @Inject() decorator to specify the dependency type.
```

或者在调试时发现 `getDependencyPlan` 中：

```
plan = {
  paramTypes: Array(0),      // ⚠️ 空数组！
  metadataMap: Map(0),
  resolvedTypes: Map(0),
  paramLength: 0             // ⚠️ 长度为 0！
}
```

## 问题场景

### 场景 1：Monorepo 项目根目录缺少 tsconfig.json

```
my-monorepo/
├── packages/
│   └── my-app/
│       ├── src/
│       │   └── main.ts
│       └── tsconfig.json    # ← 子包有 tsconfig
└── (根目录没有 tsconfig.json)  # ⚠️ 问题所在
```

### 场景 2：VSCode/Cursor Bun 调试插件直接运行文件

使用 Bun 插件的 "Debug File" 或 "Run File" 功能直接运行 `.ts`
文件时，可能不会读取正确的 `tsconfig.json`。

### 问题代码示例

```typescript
// 期望不加 @Inject 也能工作
@Controller("/webhook")
class WebhookController {
  constructor(private webhookService: WebhookEventService) {} // ❌ 注入失败
}

// 必须加 @Inject 才能工作
@Controller("/webhook")
class WebhookController {
  constructor(
    @Inject(WebhookEventService) private webhookService: WebhookEventService,
  ) {} // ✅ 正常
}
```

## 问题原因

### 核心原理

框架的依赖注入依赖 TypeScript 的 `emitDecoratorMetadata`
特性。当启用此特性时，TypeScript 编译器会为带有装饰器的类生成
`design:paramtypes` 元数据，框架通过这个元数据获取构造函数参数的类型。

```typescript
// TypeScript 会生成类似这样的元数据
Reflect.defineMetadata(
  "design:paramtypes",
  [WebhookEventService],
  WebhookController,
);
```

### 原因 1：Monorepo 根目录缺少 tsconfig.json

在 Bun monorepo 项目中，当从根目录运行子包的代码时，Bun 会查找**运行目录**的
`tsconfig.json`，而不是源文件所在目录的配置。

如果根目录没有 `tsconfig.json`，或者配置中没有
`emitDecoratorMetadata: true`，则不会生成类型元数据。

### 原因 2：调试插件不读取 tsconfig.json

VSCode/Cursor 的 Bun 调试插件在直接运行文件时，可能不会正确读取项目的
`tsconfig.json` 配置。

**对比**：

- `bun run start`（通过 package.json scripts）→ ✅ 正确读取 tsconfig
- 调试插件直接运行 `${file}` → ❌ 可能不读取 tsconfig

### 原因 3：tsconfig.json 缺少必要配置

```json
{
  "compilerOptions": {
    "experimentalDecorators": true, // 必须
    "emitDecoratorMetadata": true // 必须
  }
}
```

## 解决方案

### 方案 1：Monorepo 根目录添加 tsconfig.json（推荐）

在 monorepo 根目录创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "noEmit": true
  }
}
```

**关键点**：

- 必须包含 `experimentalDecorators: true`
- 必须包含 `emitDecoratorMetadata: true`

### 方案 2：配置调试器使用 tsconfig

修改 `.vscode/launch.json`，添加 `runtimeArgs`：

```json
{
  "type": "bun",
  "request": "launch",
  "name": "Debug File",
  "program": "${file}",
  "cwd": "${workspaceFolder}",
  "runtimeArgs": ["--tsconfig-override", "${workspaceFolder}/tsconfig.json"]
}
```

### 方案 3：使用 bunfig.toml 指定 tsconfig

在项目根目录创建 `bunfig.toml`：

```toml
tsconfig = "./tsconfig.json"
```

### 方案 4：始终使用 @Inject（兜底方案）

如果无法修改项目配置，可以始终使用 `@Inject()` 装饰器：

```typescript
@Controller("/webhook")
class WebhookController {
  constructor(
    @Inject(WebhookEventService) private webhookService: WebhookEventService,
  ) {}
}
```

## 排查步骤

### 步骤 1：验证 design:paramtypes 是否生成

在代码中添加调试：

```typescript
import "reflect-metadata";

// 在 Controller 定义之后
console.log(
  "paramTypes:",
  Reflect.getMetadata("design:paramtypes", YourController),
);
// 期望输出: [class ServiceA, class ServiceB, ...]
// 问题输出: undefined 或 []
```

### 步骤 2：检查 tsconfig.json 配置

确认配置文件存在且包含：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 步骤 3：检查运行方式

```bash
bun run start

bun src/main.ts
```

## 完整示例

### 错误配置 ❌

```
my-monorepo/
├── packages/
│   └── my-app/
│       ├── src/main.ts
│       └── tsconfig.json
└── (根目录没有 tsconfig.json)
```

```json
// .vscode/launch.json
{
  "type": "bun",
  "request": "launch",
  "name": "Debug File",
  "program": "${file}",
  "cwd": "${workspaceFolder}"
  // ❌ 没有指定 tsconfig
}
```

### 正确配置 ✅

```
my-monorepo/
├── packages/
│   └── my-app/
│       ├── src/main.ts
│       └── tsconfig.json
└── tsconfig.json              # ✅ 根目录也有 tsconfig
```

```json
// 根目录 tsconfig.json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
    // ... 其他配置
  }
}
```

```json
// .vscode/launch.json
{
  "type": "bun",
  "request": "launch",
  "name": "Debug File",
  "program": "${file}",
  "cwd": "${workspaceFolder}",
  "runtimeArgs": ["--tsconfig-override", "${workspaceFolder}/tsconfig.json"]
}
```

## 检查清单

使用前，确保：

- [ ] 项目根目录存在 `tsconfig.json`（特别是 monorepo）
- [ ] `tsconfig.json` 包含 `experimentalDecorators: true`
- [ ] `tsconfig.json` 包含 `emitDecoratorMetadata: true`

## 相关源码位置

| 功能           | 文件                   | 行号                         |
| -------------- | ---------------------- | ---------------------------- |
| 依赖计划构建   | `src/di/container.ts`  | `getDependencyPlan` 方法     |
| 依赖解析       | `src/di/container.ts`  | `resolveFromPlan` 方法       |
| @Inject 装饰器 | `src/di/decorators.ts` | `Inject` 函数                |
| 元数据获取     | `src/di/decorators.ts` | `getDependencyMetadata` 函数 |

## 常见问题 FAQ

### Q1: 为什么 `bun run start` 可以工作，但调试模式不行？

A: `bun run start` 会从 `package.json` 所在目录查找
`tsconfig.json`，而调试插件直接运行文件时可能从工作区根目录查找。在 monorepo
中，这两个位置可能不同。

### Q2: 为什么本仓库的 example 不需要 @Inject 也能工作？

A: 本仓库的根目录和 `packages/bun-server/` 目录都有正确配置的
`tsconfig.json`，且测试通过 `bun test` 或 `bun run` 运行，会正确读取配置。

### Q3: 使用 @Inject 有什么缺点？

A: 主要是代码冗余。如果类型和 token 相同，需要写两遍类名：

```typescript
constructor(@Inject(Service) private service: Service) {}
```

正确配置后可以简化为：

```typescript
constructor(private service: Service) {}
```

### Q4: 如何验证 Bun 是否读取了正确的 tsconfig？

A: 可以在 tsconfig.json 中添加一个明显错误的配置（如无效的 `target`
值），然后运行代码。如果报错，说明读取了该配置；如果不报错，说明没有读取。

## 更新历史

- 2026-02-04: 初始版本，记录 monorepo 场景下的 DI 注入问题排查经验
