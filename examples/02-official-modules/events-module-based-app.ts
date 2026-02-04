/**
 * 完全基于 Module 注册的事件系统示例
 *
 * 本示例展示如何通过模块化方式组织事件驱动架构：
 * - 将服务和监听器按功能分组到独立的模块中
 * - 通过 Module 的 imports/exports 机制管理依赖关系
 * - 利用 EventModule 自动发现和注册事件监听器
 * - 实现完全的模块化和解耦
 *
 * 模块组织：
 * - UserModule: 用户管理功能（Controller + Service）
 * - OrderModule: 订单管理功能（Controller + Service）
 * - NotificationModule: 通知服务（事件监听器）
 * - AnalyticsModule: 分析服务（事件监听器）
 * - AuditModule: 审计服务（事件监听器）
 * - AppModule: 应用根模块（组装所有模块）
 *
 * 与 events-app.ts 的区别：
 * 1. 模块化架构：
 *    - events-app.ts: 所有服务和控制器都在一个根模块中
 *    - 本示例: 按功能域拆分为多个独立模块
 *
 * 2. 职责分离：
 *    - events-app.ts: 业务逻辑和事件监听器混在一起
 *    - 本示例: 业务模块（User/Order）和监听器模块（Notification/Analytics/Audit）分离
 *
 * 3. 依赖管理：
 *    - events-app.ts: 通过根模块统一管理所有依赖
 *    - 本示例: 每个模块声明自己的依赖（imports EventModule）
 *
 * 4. 可测试性：
 *    - events-app.ts: 需要初始化整个应用才能测试
 *    - 本示例: 可以独立测试每个模块
 *
 * 5. 可扩展性：
 *    - events-app.ts: 添加新功能需要修改根模块
 *    - 本示例: 添加新功能只需创建新模块并在 AppModule 中导入
 *
 * 优势：
 * ✅ 清晰的边界：每个模块有明确的职责和边界
 * ✅ 易于维护：修改一个模块不影响其他模块
 * ✅ 易于测试：可以为每个模块编写独立的单元测试
 * ✅ 易于扩展：添加新功能不影响现有代码
 * ✅ 团队协作：不同团队可以独立开发不同的模块
 *
 * 适用场景：
 * - 中大型应用（多个业务域）
 * - 需要团队协作开发的项目
 * - 需要长期维护和扩展的项目
 * - 需要独立测试各个功能模块的项目
 *
 * 运行方式：
 * ```bash
 * bun start:events-module
 * # 或
 * bun 02-official-modules/events-module-based-app.ts
 * ```
 */

import {
  Application,
  Body,
  ConfigModule,
  Controller,
  EventModule,
  GET,
  Inject,
  Injectable,
  LoggerModule,
  LogLevel,
  Module,
  ModuleRegistry,
  OnEvent,
  POST,
  EVENT_EMITTER_TOKEN,
} from '@dangao/bun-server';
import type { EventEmitter } from '@dangao/bun-server';

// ==================== 基础配置（必须在模块定义之前） ====================

const port = Number(process.env.PORT ?? 3401);

// 配置 ConfigModule（必须在其他模块使用之前）
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: 'Events Module-Based App',
      port,
    },
  },
});

// 配置 Logger 模块
LoggerModule.forRoot({
  logger: {
    prefix: 'EventsModuleApp',
    level: LogLevel.INFO,
  },
  enableRequestLogging: true,
});

// 配置 Event 模块（必须在子模块导入之前）
EventModule.forRoot({
  wildcard: true, // 启用通配符事件
  maxListeners: 20, // 最大监听器数量
  onError: (error, event, payload) => {
    console.error(`[EventModule] Error in event handler for "${String(event)}":`, error);
  },
});

// ==================== 事件定义 ====================

/**
 * 用户相关事件 Symbol
 */
const USER_CREATED = Symbol('user.created');
const USER_UPDATED = Symbol('user.updated');
const USER_DELETED = Symbol('user.deleted');

/**
 * 用户创建事件负载
 */
interface UserCreatedEvent {
  userId: string;
  email: string;
  username: string;
  createdAt: Date;
}

/**
 * 用户更新事件负载
 */
interface UserUpdatedEvent {
  userId: string;
  changes: Record<string, unknown>;
  updatedAt: Date;
}

/**
 * 用户删除事件负载
 */
interface UserDeletedEvent {
  userId: string;
  deletedAt: Date;
}

/**
 * 订单创建事件负载
 */
interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  amount: number;
  createdAt: Date;
}

// ==================== UserModule - 用户管理模块 ====================

/**
 * 用户服务 - 负责用户 CRUD 和事件发布
 */
@Injectable()
class UserService {
  private users: Map<string, { id: string; email: string; username: string }> = new Map();
  private nextId = 1;

  public constructor(
    @Inject(EVENT_EMITTER_TOKEN) private readonly eventEmitter: EventEmitter,
  ) {}

  /**
   * 创建用户并发布事件
   */
  public async createUser(email: string, username: string): Promise<{ id: string; email: string; username: string }> {
    const id = `user-${this.nextId++}`;
    const user = { id, email, username };
    this.users.set(id, user);

    // 发布用户创建事件
    this.eventEmitter.emit<UserCreatedEvent>(USER_CREATED, {
      userId: id,
      email,
      username,
      createdAt: new Date(),
    });

    console.log(`[UserService] User created: ${id}`);
    return user;
  }

  /**
   * 更新用户并发布事件
   */
  public async updateUser(userId: string, changes: Record<string, unknown>): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user) {
      return false;
    }

    Object.assign(user, changes);

    // 发布用户更新事件
    this.eventEmitter.emit<UserUpdatedEvent>(USER_UPDATED, {
      userId,
      changes,
      updatedAt: new Date(),
    });

    console.log(`[UserService] User updated: ${userId}`);
    return true;
  }

  /**
   * 删除用户并发布事件
   */
  public async deleteUser(userId: string): Promise<boolean> {
    if (!this.users.has(userId)) {
      return false;
    }

    this.users.delete(userId);

    // 发布用户删除事件
    this.eventEmitter.emit<UserDeletedEvent>(USER_DELETED, {
      userId,
      deletedAt: new Date(),
    });

    console.log(`[UserService] User deleted: ${userId}`);
    return true;
  }

  public getUser(userId: string): { id: string; email: string; username: string } | undefined {
    return this.users.get(userId);
  }

  public getAllUsers(): { id: string; email: string; username: string }[] {
    return Array.from(this.users.values());
  }
}

/**
 * 用户控制器
 */
@Controller('/api/users')
class UserController {
  public constructor(
    private readonly userService: UserService,
  ) {}

  @POST('/')
  public async createUser(@Body() body: { email: string; username: string }) {
    const user = await this.userService.createUser(body.email, body.username);
    return { success: true, user };
  }

  @POST('/:id/update')
  public async updateUser(@Body() body: { id: string; changes: Record<string, unknown> }) {
    const success = await this.userService.updateUser(body.id, body.changes);
    return { success };
  }

  @POST('/:id/delete')
  public async deleteUser(@Body() body: { id: string }) {
    const success = await this.userService.deleteUser(body.id);
    return { success };
  }

  @GET('/')
  public getAllUsers() {
    return { users: this.userService.getAllUsers() };
  }
}

/**
 * 用户模块 - 封装用户相关的所有功能
 */
@Module({
  imports: [EventModule], // 导入 EventModule 以访问 EventEmitter
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // 导出 UserService 供其他模块使用
})
class UserModule {}

// ==================== OrderModule - 订单管理模块 ====================

/**
 * 订单服务 - 负责订单 CRUD 和事件发布
 */
@Injectable()
class OrderService {
  private orders: Map<string, { id: string; userId: string; amount: number }> = new Map();
  private nextId = 1;

  public constructor(
    @Inject(EVENT_EMITTER_TOKEN) private readonly eventEmitter: EventEmitter,
  ) {}

  /**
   * 创建订单并发布事件
   */
  public async createOrder(userId: string, amount: number): Promise<{ id: string; userId: string; amount: number }> {
    const id = `order-${this.nextId++}`;
    const order = { id, userId, amount };
    this.orders.set(id, order);

    // 使用字符串事件名发布事件
    this.eventEmitter.emit<OrderCreatedEvent>('order.created', {
      orderId: id,
      userId,
      amount,
      createdAt: new Date(),
    });

    console.log(`[OrderService] Order created: ${id}`);
    return order;
  }

  public getOrder(orderId: string): { id: string; userId: string; amount: number } | undefined {
    return this.orders.get(orderId);
  }

  public getAllOrders(): { id: string; userId: string; amount: number }[] {
    return Array.from(this.orders.values());
  }
}

/**
 * 订单控制器
 */
@Controller('/api/orders')
class OrderController {
  public constructor(
    private readonly orderService: OrderService,
  ) {}

  @POST('/')
  public async createOrder(@Body() body: { userId: string; amount: number }) {
    const order = await this.orderService.createOrder(body.userId, body.amount);
    return { success: true, order };
  }

  @GET('/')
  public getAllOrders() {
    return { orders: this.orderService.getAllOrders() };
  }
}

/**
 * 订单模块 - 封装订单相关的所有功能
 */
@Module({
  imports: [EventModule], // 导入 EventModule 以访问 EventEmitter
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService], // 导出 OrderService 供其他模块使用
})
class OrderModule {}

// ==================== NotificationModule - 通知服务模块 ====================

/**
 * 通知服务 - 监听用户事件发送通知
 */
@Injectable()
class NotificationService {
  private notifications: string[] = [];

  /**
   * 监听用户创建事件，发送欢迎邮件
   */
  @OnEvent(USER_CREATED)
  public async handleUserCreated(payload: UserCreatedEvent): Promise<void> {
    console.log(`[NotificationService] Sending welcome email to ${payload.email}`);
    // 模拟发送邮件
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.notifications.push(`Welcome email sent to ${payload.email}`);
  }

  /**
   * 监听用户更新事件
   */
  @OnEvent(USER_UPDATED)
  public handleUserUpdated(payload: UserUpdatedEvent): void {
    console.log(`[NotificationService] User ${payload.userId} profile updated`);
    this.notifications.push(`Profile update notification for user ${payload.userId}`);
  }

  /**
   * 监听用户删除事件
   */
  @OnEvent(USER_DELETED)
  public handleUserDeleted(payload: UserDeletedEvent): void {
    console.log(`[NotificationService] User ${payload.userId} account deleted`);
    this.notifications.push(`Account deletion confirmation for user ${payload.userId}`);
  }

  public getNotifications(): string[] {
    return [...this.notifications];
  }
}

/**
 * 通知控制器 - 提供查询通知的 API
 */
@Controller('/api/notifications')
class NotificationController {
  public constructor(
    private readonly notificationService: NotificationService,
  ) {}

  @GET('/')
  public getNotifications() {
    return { notifications: this.notificationService.getNotifications() };
  }
}

/**
 * 通知模块 - 封装通知相关的所有功能
 */
@Module({
  controllers: [NotificationController],
  providers: [NotificationService],
  exports: [NotificationService],
})
class NotificationModule {}

// ==================== AnalyticsModule - 分析服务模块 ====================

/**
 * 分析服务 - 监听事件进行数据分析
 */
@Injectable()
class AnalyticsService {
  private events: string[] = [];

  /**
   * 监听用户创建事件（高优先级）
   */
  @OnEvent(USER_CREATED, { priority: 10 })
  public trackUserCreation(payload: UserCreatedEvent): void {
    console.log(`[AnalyticsService] Tracking user creation: ${payload.userId}`);
    this.events.push(`user_created:${payload.userId}`);
  }

  /**
   * 监听订单创建事件（异步处理）
   */
  @OnEvent('order.created', { async: true, priority: 5 })
  public async trackOrderCreation(payload: OrderCreatedEvent): Promise<void> {
    console.log(`[AnalyticsService] Tracking order creation: ${payload.orderId}`);
    // 模拟异步处理
    await new Promise((resolve) => setTimeout(resolve, 50));
    this.events.push(`order_created:${payload.orderId}:$${payload.amount}`);
  }

  public getEvents(): string[] {
    return [...this.events];
  }
}

/**
 * 分析控制器 - 提供查询分析数据的 API
 */
@Controller('/api/analytics')
class AnalyticsController {
  public constructor(
    private readonly analyticsService: AnalyticsService,
  ) {}

  @GET('/events')
  public getAnalyticsEvents() {
    return { events: this.analyticsService.getEvents() };
  }
}

/**
 * 分析模块 - 封装分析相关的所有功能
 */
@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
class AnalyticsModule {}

// ==================== AuditModule - 审计服务模块 ====================

/**
 * 审计服务 - 使用通配符监听所有事件
 */
@Injectable()
class AuditService {
  private auditLog: string[] = [];

  /**
   * 监听所有 order.* 事件
   */
  @OnEvent('order.*')
  public auditOrderEvents(payload: unknown): void {
    console.log(`[AuditService] Order event received:`, payload);
    this.auditLog.push(`order_event:${JSON.stringify(payload)}`);
  }

  /**
   * 监听所有 user.* 事件（使用字符串模式）
   * 注意：Symbol 事件无法使用通配符，这里演示如何同时处理 Symbol 和字符串事件
   */
  @OnEvent(USER_CREATED)
  public auditUserCreated(payload: UserCreatedEvent): void {
    console.log(`[AuditService] User created event:`, payload);
    this.auditLog.push(`user_created:${payload.userId}`);
  }

  @OnEvent(USER_UPDATED)
  public auditUserUpdated(payload: UserUpdatedEvent): void {
    console.log(`[AuditService] User updated event:`, payload);
    this.auditLog.push(`user_updated:${payload.userId}`);
  }

  @OnEvent(USER_DELETED)
  public auditUserDeleted(payload: UserDeletedEvent): void {
    console.log(`[AuditService] User deleted event:`, payload);
    this.auditLog.push(`user_deleted:${payload.userId}`);
  }

  public getAuditLog(): string[] {
    return [...this.auditLog];
  }
}

/**
 * 审计控制器 - 提供查询审计日志的 API
 */
@Controller('/api/audit')
class AuditController {
  public constructor(
    private readonly auditService: AuditService,
  ) {}

  @GET('/logs')
  public getAuditLog() {
    return { auditLog: this.auditService.getAuditLog() };
  }
}

/**
 * 审计模块 - 封装审计相关的所有功能
 */
@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
class AuditModule {}

// ==================== AppModule - 应用根模块 ====================

/**
 * 应用根模块 - 组装所有功能模块
 *
 * 通过 imports 导入所有功能模块，框架会自动：
 * 1. 注册所有模块中的 controllers 和 providers
 * 2. 解析模块间的依赖关系
 * 3. 发现并注册所有 @OnEvent() 装饰的事件监听器
 * 4. 初始化事件监听器
 */
@Module({
  imports: [
    // 基础设施模块
    ConfigModule,
    LoggerModule,
    EventModule.forRoot({ wildcard: true, maxListeners: 20 }),
    // 业务功能模块
    UserModule,
    OrderModule,
    // 事件监听器模块
    NotificationModule,
    AnalyticsModule,
    AuditModule,
  ],
})
class AppModule {}

// ==================== 应用启动 ====================

const app = new Application({ port });
app.registerModule(AppModule);

// 🎉 框架会自动扫描和注册所有使用 @OnEvent 装饰器的监听器类
// 无需手动调用 EventModule.initializeListeners()！
// 
// 如果需要禁用自动扫描，可以在 EventModule.forRoot() 中设置：
// EventModule.forRoot({ autoScan: false })
// 
// 如果需要手动控制监听器注册，可以使用：
// EventModule.forRoot({
//   autoScan: false,  // 禁用自动扫描
//   includeListeners: [NotificationService, AnalyticsService],  // 强制注册这些类
// })

app.listen(port);

console.log(`🚀 Events Module-Based App running on http://localhost:${port}`);
console.log(`\n📦 Module Architecture:`);
console.log(`  AppModule (root)`);
console.log(`  ├── ConfigModule`);
console.log(`  ├── LoggerModule`);
console.log(`  ├── EventModule`);
console.log(`  ├── UserModule (controllers, services)`);
console.log(`  ├── OrderModule (controllers, services)`);
console.log(`  ├── NotificationModule (event listeners)`);
console.log(`  ├── AnalyticsModule (event listeners)`);
console.log(`  └── AuditModule (event listeners)`);
console.log(`\n📝 Available endpoints:`);
console.log(`  POST /api/users/            - Create a user (triggers USER_CREATED event)`);
console.log(`  POST /api/users/:id/update  - Update a user (triggers USER_UPDATED event)`);
console.log(`  POST /api/users/:id/delete  - Delete a user (triggers USER_DELETED event)`);
console.log(`  GET  /api/users/            - Get all users`);
console.log(`  POST /api/orders/           - Create an order (triggers order.created event)`);
console.log(`  GET  /api/orders/           - Get all orders`);
console.log(`  GET  /api/notifications/    - View notifications sent`);
console.log(`  GET  /api/analytics/events  - View analytics events tracked`);
console.log(`  GET  /api/audit/logs        - View audit log`);
console.log(`\n🧪 Try it with curl:`);
console.log(`  # 1. Create a user (triggers USER_CREATED event)`);
console.log(`  curl -X POST http://localhost:${port}/api/users/ \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"email":"alice@example.com","username":"alice"}'`);
console.log(``);
console.log(`  # 2. Check notifications`);
console.log(`  curl http://localhost:${port}/api/notifications/`);
console.log(``);
console.log(`  # 3. Check analytics`);
console.log(`  curl http://localhost:${port}/api/analytics/events`);
console.log(``);
console.log(`  # 4. Check audit log`);
console.log(`  curl http://localhost:${port}/api/audit/logs`);
console.log(``);
console.log(`  # 5. Create an order (triggers order.created event)`);
console.log(`  curl -X POST http://localhost:${port}/api/orders/ \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"userId":"user-1","amount":199.99}'`);
console.log(``);
console.log(`  # 6. Update a user (triggers USER_UPDATED event)`);
console.log(`  curl -X POST http://localhost:${port}/api/users/user-1/update \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"id":"user-1","changes":{"username":"alice_updated"}}'`);
console.log(``);
console.log(`  # 7. Delete a user (triggers USER_DELETED event)`);
console.log(`  curl -X POST http://localhost:${port}/api/users/user-1/delete \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"id":"user-1"}'`);
console.log(``);
console.log(`\n✨ Key Features:`);
console.log(`  ✅ Modular architecture - each feature in its own module`);
console.log(`  ✅ Clear separation of concerns - business logic, controllers, listeners`);
console.log(`  ✅ Automatic dependency resolution - framework handles DI`);
console.log(`  ✅ Event-driven design - decoupled communication between modules`);
console.log(`  ✅ Easy to test and maintain - isolated modules`);
