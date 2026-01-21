# 事件系统

事件模块提供了强大的事件驱动架构，用于构建松耦合、高可维护性的应用。它支持同步和异步事件处理、事件优先级和通配符事件模式。

## 目录

- [安装](#安装)
- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [事件模块配置](#事件模块配置)
- [发布事件](#发布事件)
- [监听事件](#监听事件)
- [事件优先级](#事件优先级)
- [异步事件处理](#异步事件处理)
- [通配符事件](#通配符事件)
- [错误处理](#错误处理)
- [最佳实践](#最佳实践)
- [API 参考](#api-参考)

## 安装

事件模块已包含在 `@dangao/bun-server` 中，无需额外安装。

## 快速开始

```typescript
import {
  Application,
  Module,
  Injectable,
  Inject,
  EventModule,
  OnEvent,
  EVENT_EMITTER_TOKEN,
} from '@dangao/bun-server';
import type { EventEmitter } from '@dangao/bun-server';

// 定义事件
const USER_CREATED = Symbol('user.created');

interface UserCreatedEvent {
  userId: string;
  email: string;
}

// 发布事件的服务
@Injectable()
class UserService {
  constructor(
    @Inject(EVENT_EMITTER_TOKEN) private eventEmitter: EventEmitter,
  ) {}

  async createUser(email: string) {
    const userId = 'user-123';
    
    // 发布事件
    this.eventEmitter.emit<UserCreatedEvent>(USER_CREATED, {
      userId,
      email,
    });
    
    return { userId, email };
  }
}

// 监听事件的服务
@Injectable()
class NotificationService {
  @OnEvent(USER_CREATED)
  handleUserCreated(payload: UserCreatedEvent) {
    console.log(`欢迎邮件已发送至 ${payload.email}`);
  }
}

// 配置模块
EventModule.forRoot({
  maxListeners: 20,
});

EventModule.registerListeners([NotificationService]);

@Module({
  imports: [EventModule],
  providers: [UserService, NotificationService],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);

// 模块注册后初始化事件监听器
EventModule.initializeListeners(app.getContainer());

app.listen(3000);
```

## 核心概念

### 事件名称

事件可以通过以下方式标识：

- **Symbol**：推荐使用，提供类型安全并避免命名冲突
- **字符串**：适用于动态事件或通配符匹配

```typescript
// Symbol 事件（推荐）
const USER_CREATED = Symbol('user.created');

// 字符串事件
const orderEvent = 'order.created';
```

### 事件负载

事件可以携带任何数据作为负载。建议定义接口以确保类型安全：

```typescript
interface UserCreatedEvent {
  userId: string;
  email: string;
  createdAt: Date;
}

// 使用类型化负载发布
eventEmitter.emit<UserCreatedEvent>(USER_CREATED, {
  userId: '123',
  email: 'user@example.com',
  createdAt: new Date(),
});
```

## 事件模块配置

```typescript
EventModule.forRoot({
  // 启用通配符事件匹配
  wildcard: true,  // 默认: false
  
  // 通配符匹配的分隔符
  delimiter: '.',  // 默认: '.'
  
  // 全局事件前缀
  globalPrefix: 'app',  // 可选
  
  // 每个事件的最大监听器数量（内存泄漏警告）
  maxListeners: 10,  // 默认: 10
  
  // 自定义错误处理器
  onError: (error, event, payload) => {
    console.error(`事件 ${String(event)} 发生错误:`, error);
  },
});
```

## 发布事件

### 同步发布

使用 `emit()` 同步发布事件。异步监听器会被触发但不会等待：

```typescript
@Injectable()
class OrderService {
  constructor(
    @Inject(EVENT_EMITTER_TOKEN) private eventEmitter: EventEmitter,
  ) {}

  createOrder(userId: string, amount: number) {
    const order = { id: 'order-1', userId, amount };
    
    // 发布事件（不等待异步监听器）
    this.eventEmitter.emit('order.created', {
      orderId: order.id,
      userId,
      amount,
    });
    
    return order;
  }
}
```

### 异步发布

使用 `emitAsync()` 等待所有监听器（包括异步监听器）完成：

```typescript
async createOrder(userId: string, amount: number) {
  const order = { id: 'order-1', userId, amount };
  
  // 等待所有监听器完成
  await this.eventEmitter.emitAsync('order.created', {
    orderId: order.id,
    userId,
    amount,
  });
  
  return order;
}
```

## 监听事件

### 使用 `@OnEvent()` 装饰器

推荐的事件监听方式：

```typescript
@Injectable()
class NotificationService {
  @OnEvent('user.created')
  handleUserCreated(payload: { email: string }) {
    console.log(`发送欢迎邮件至 ${payload.email}`);
  }
  
  @OnEvent(USER_DELETED)
  async handleUserDeleted(payload: { userId: string }) {
    await this.cleanupUserData(payload.userId);
  }
}
```

### 手动订阅

你也可以使用 EventEmitter 手动订阅：

```typescript
@Injectable()
class DynamicListener {
  constructor(
    @Inject(EVENT_EMITTER_TOKEN) private eventEmitter: EventEmitter,
  ) {
    // 订阅
    const unsubscribe = this.eventEmitter.on('custom.event', (payload) => {
      console.log('收到:', payload);
    });
    
    // 之后: 取消订阅
    // unsubscribe();
  }
}
```

### 一次性监听器

```typescript
// 使用装饰器（监听器在第一次调用后被移除）
// 注意: @OnEvent 不直接支持 once，请使用手动订阅

// 手动一次性订阅
this.eventEmitter.once('setup.complete', (payload) => {
  console.log('设置完成！');
});
```

## 事件优先级

优先级高的监听器先执行：

```typescript
@Injectable()
class HighPriorityService {
  @OnEvent('order.created', { priority: 100 })
  validateOrder(payload: OrderCreatedEvent) {
    // 最先执行
    console.log('验证订单...');
  }
}

@Injectable()
class LowPriorityService {
  @OnEvent('order.created', { priority: 1 })
  logOrder(payload: OrderCreatedEvent) {
    // 最后执行
    console.log('记录订单...');
  }
}
```

默认优先级为 `0`。相同优先级的监听器按注册顺序执行。

## 异步事件处理

将监听器标记为异步以确保正确的错误处理：

```typescript
@Injectable()
class EmailService {
  @OnEvent('user.created', { async: true })
  async sendWelcomeEmail(payload: { email: string }) {
    await this.mailer.send({
      to: payload.email,
      subject: '欢迎！',
      body: '...',
    });
  }
}
```

使用 `emit()` 时：
- 异步监听器被触发但不会等待
- 错误会被捕获并传递给错误处理器

使用 `emitAsync()` 时：
- 所有监听器（同步和异步）都会被等待
- 所有错误都会被捕获和处理

## 通配符事件

在模块配置中启用通配符匹配：

```typescript
EventModule.forRoot({
  wildcard: true,
});
```

### 单通配符 (`*`)

精确匹配一个段：

```typescript
@OnEvent('user.*')
handleAnyUserEvent(payload: unknown) {
  // 匹配: user.created, user.updated, user.deleted
  // 不匹配: user.profile.updated
}
```

### 双通配符 (`**`)

匹配任意数量的段：

```typescript
@OnEvent('order.**')
handleAllOrderEvents(payload: unknown) {
  // 匹配: order.created, order.item.added, order.payment.completed
}
```

## 错误处理

### 全局错误处理器

```typescript
EventModule.forRoot({
  onError: (error, event, payload) => {
    // 记录到监控服务
    console.error(`事件 ${String(event)} 处理器错误:`, error);
    
    // 可选择重新抛出或处理
  },
});
```

### 监听器中的 Try-Catch

```typescript
@OnEvent('risky.event', { async: true })
async handleRiskyEvent(payload: unknown) {
  try {
    await this.riskyOperation(payload);
  } catch (error) {
    // 处理或记录错误
    console.error('处理事件失败:', error);
    // 可选择重新抛出以触发全局错误处理器
    throw error;
  }
}
```

## 最佳实践

### 1. 使用 Symbol 作为事件名称

```typescript
// 好: 类型安全，无命名冲突
export const USER_CREATED = Symbol('user.created');

// 避免: 可能与其他事件冲突
const eventName = 'user.created';
```

### 2. 定义事件负载接口

```typescript
// 好: 清晰的契约
export interface UserCreatedEvent {
  userId: string;
  email: string;
  createdAt: Date;
}

// 避免: 不清晰的负载结构
eventEmitter.emit(USER_CREATED, { userId, email, date: new Date() });
```

### 3. 保持监听器职责单一

```typescript
// 好: 单一职责
@OnEvent(USER_CREATED)
sendWelcomeEmail(payload: UserCreatedEvent) { ... }

@OnEvent(USER_CREATED)
trackUserSignup(payload: UserCreatedEvent) { ... }

// 避免: 职责过多
@OnEvent(USER_CREATED)
handleUserCreated(payload: UserCreatedEvent) {
  this.sendEmail();
  this.trackAnalytics();
  this.notifyAdmin();
  this.createDefaultSettings();
}
```

### 4. 优雅地处理错误

```typescript
// 好: 错误不会破坏其他监听器
@OnEvent('payment.failed', { async: true })
async handlePaymentFailure(payload: PaymentFailedEvent) {
  try {
    await this.notifyUser(payload.userId);
  } catch (error) {
    this.logger.error('通知用户失败', error);
    // 除非必要，不要重新抛出
  }
}
```

### 5. 明智地使用优先级

```typescript
// 好: 处理前先验证
@OnEvent('order.submitted', { priority: 100 })
validateOrder(payload: OrderEvent) { ... }

@OnEvent('order.submitted', { priority: 50 })
processOrder(payload: OrderEvent) { ... }

@OnEvent('order.submitted', { priority: 1 })
logOrder(payload: OrderEvent) { ... }
```

## API 参考

### EventModule

| 方法 | 描述 |
|------|------|
| `forRoot(options?)` | 配置事件模块 |
| `registerListeners(classes)` | 注册监听器类 |
| `initializeListeners(container, additional?)` | 初始化并扫描监听器 |
| `getEventEmitter(container)` | 获取 EventEmitter 实例 |

### EventEmitter

| 方法 | 描述 |
|------|------|
| `emit(event, payload)` | 同步发布事件 |
| `emitAsync(event, payload)` | 发布事件并等待所有监听器 |
| `on(event, listener, options?)` | 订阅事件 |
| `once(event, listener, options?)` | 一次性订阅事件 |
| `off(event, listener)` | 取消订阅事件 |
| `removeAllListeners(event?)` | 移除所有监听器 |
| `listenerCount(event)` | 获取事件的监听器数量 |
| `eventNames()` | 获取所有已注册的事件名称 |

### @OnEvent 装饰器

```typescript
@OnEvent(event: string | symbol, options?: {
  async?: boolean;    // 默认: false
  priority?: number;  // 默认: 0
})
```

### EventModuleOptions

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `wildcard` | `boolean` | `false` | 启用通配符匹配 |
| `delimiter` | `string` | `'.'` | 通配符分隔符 |
| `globalPrefix` | `string` | - | 所有事件的前缀 |
| `maxListeners` | `number` | `10` | 每个事件的最大监听器数量 |
| `onError` | `function` | - | 全局错误处理器 |

## 相关文档

- [开发指南](./guide.md) - 框架指南
- [请求生命周期](./request-lifecycle.md) - 理解请求流程
