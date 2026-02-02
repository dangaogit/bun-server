# Skills 快速索引

## 按错误信息查找

### "Provider not found for token"

- **模块**: EventModule, 其他需要 `forRoot()` 的模块
- **问题**: [EventModule 配置和初始化](./events/event-module-setup.md)
- **关键词**: EVENT_EMITTER_TOKEN, forRoot, DI container

### "@OnEvent 装饰器不生效"

- **模块**: EventModule
- **问题**:
  [EventModule 配置和初始化](./events/event-module-setup.md#步骤-2在启动时初始化事件监听器)
- **关键词**: OnEvent, initializeListeners, event listeners

## 按模块查找

### EventModule

- [EventModule 配置和初始化问题](./events/event-module-setup.md)
  - Provider not found 错误
  - 事件监听器不生效
  - 模块化架构中的配置顺序

### DI Container

敬请期待...

### Module System

敬请期待...

## 按场景查找

### 应用启动失败

- [EventModule: Provider not found](./events/event-module-setup.md)

### 功能不生效

- [EventModule: @OnEvent 装饰器不工作](./events/event-module-setup.md#原因-2没有初始化事件监听器)

### 模块化架构

- [EventModule: 配置顺序问题](./events/event-module-setup.md#模块化架构中的特殊情况)

## 常见问题模式

### 需要调用 `forRoot()` 的模块

以下模块需要调用 `forRoot()` 来配置和注册服务：

- `EventModule`
- `LoggerModule`
- `ConfigModule`
- `SecurityModule`
- `SwaggerModule`
- `DatabaseModule`
- `CacheModule`
- `QueueModule`
- `SessionModule`
- `MetricsModule`
- `HealthModule`

**记住**：在模块的 `imports` 中使用这些模块时，必须调用 `forRoot()`：

```typescript
// ❌ 错误
@Module({
  imports: [EventModule],
})

// ✅ 正确
@Module({
  imports: [EventModule.forRoot({ ... })],
})
```

### 需要初始化的功能

以下功能需要在应用启动时手动初始化：

- **EventModule 监听器**: 如果使用了 `@OnEvent` 装饰器，需要调用
  `EventModule.initializeListeners()`
- **WebSocket Gateway**: 自动注册，无需手动初始化

## 如何贡献

发现新问题？欢迎按照 [TEMPLATE.md](./TEMPLATE.md) 创建新的问题文档！

1. 选择合适的分类目录（events/di/modules/common）
2. 复制 TEMPLATE.md 创建新文件
3. 填写完整的问题信息
4. 更新本索引文件
5. 提交 PR

## 更新日志

- 2026-02-02: 创建快速索引，添加 EventModule 相关问题
