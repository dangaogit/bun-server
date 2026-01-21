/**
 * 事件系统示例
 *
 * 本示例展示了如何使用 EventModule 实现事件驱动架构：
 * - 使用 EventModule.forRoot() 配置事件模块
 * - 使用 @OnEvent() 装饰器注册事件监听器
 * - 使用 EventEmitter 发布事件
 * - 支持同步/异步事件处理
 * - 支持事件优先级
 * - 支持通配符事件
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
 * 订单创建事件负载（使用字符串事件名）
 */
interface OrderCreatedEvent {
  orderId: string;
  userId: string;
  amount: number;
  createdAt: Date;
}

// ==================== 服务层 ====================

/**
 * 用户服务 - 演示事件发布
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
 * 订单服务 - 演示使用字符串事件名
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
}

// ==================== 事件监听器服务 ====================

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
 * 分析服务 - 监听事件进行数据分析
 * 演示事件优先级和异步处理
 */
@Injectable()
class AnalyticsService {
  private events: string[] = [];

  /**
   * 监听用户创建事件（高优先级，先于通知服务执行）
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
 * 审计服务 - 使用通配符监听所有事件
 * 注意：通配符需要在 EventModule.forRoot() 中启用 wildcard: true
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

  public getAuditLog(): string[] {
    return [...this.auditLog];
  }
}

// ==================== 控制器层 ====================

@Controller('/api/users')
class UserController {
  public constructor(
    @Inject(UserService) private readonly userService: UserService,
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

@Controller('/api/orders')
class OrderController {
  public constructor(
    @Inject(OrderService) private readonly orderService: OrderService,
  ) {}

  @POST('/')
  public async createOrder(@Body() body: { userId: string; amount: number }) {
    const order = await this.orderService.createOrder(body.userId, body.amount);
    return { success: true, order };
  }
}

@Controller('/api/events')
class EventsController {
  public constructor(
    @Inject(NotificationService) private readonly notificationService: NotificationService,
    @Inject(AnalyticsService) private readonly analyticsService: AnalyticsService,
    @Inject(AuditService) private readonly auditService: AuditService,
  ) {}

  @GET('/notifications')
  public getNotifications() {
    return { notifications: this.notificationService.getNotifications() };
  }

  @GET('/analytics')
  public getAnalyticsEvents() {
    return { events: this.analyticsService.getEvents() };
  }

  @GET('/audit')
  public getAuditLog() {
    return { auditLog: this.auditService.getAuditLog() };
  }
}

// ==================== 应用配置 ====================

const port = Number(process.env.PORT ?? 3400);

// 配置 ConfigModule
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: 'Events Example App',
      port,
    },
  },
});

// 配置 Logger 模块
LoggerModule.forRoot({
  logger: {
    prefix: 'EventsExample',
    level: LogLevel.INFO,
  },
  enableRequestLogging: true,
});

// 配置 Event 模块
EventModule.forRoot({
  wildcard: true, // 启用通配符事件
  maxListeners: 20, // 最大监听器数量
  onError: (error, event, payload) => {
    console.error(`[EventModule] Error in event handler for "${String(event)}":`, error);
  },
});

// 应用模块
@Module({
  imports: [ConfigModule, LoggerModule, EventModule],
  controllers: [UserController, OrderController, EventsController],
  providers: [
    UserService,
    OrderService,
    NotificationService,
    AnalyticsService,
    AuditService,
  ],
})
class RootModule {}

const app = new Application({ port });
app.registerModule(RootModule);

// 初始化事件监听器（必须在 registerModule 之后调用，确保模块已完全注册）
// 传入 RootModule 的容器，这样解析的服务实例和控制器中注入的是同一个
const rootModuleRef = ModuleRegistry.getInstance().getModuleRef(RootModule);
EventModule.initializeListeners(
  rootModuleRef?.container,
  [NotificationService, AnalyticsService, AuditService],
);

app.listen(port);

console.log(`🚀 Events Example Server running on http://localhost:${port}`);
console.log(`\n📝 Available endpoints:`);
console.log(`  POST /api/users/            - Create a user (triggers USER_CREATED event)`);
console.log(`  POST /api/users/:id/update  - Update a user (triggers USER_UPDATED event)`);
console.log(`  POST /api/users/:id/delete  - Delete a user (triggers USER_DELETED event)`);
console.log(`  GET  /api/users/            - Get all users`);
console.log(`  POST /api/orders/           - Create an order (triggers order.created event)`);
console.log(`  GET  /api/events/notifications - View notifications sent`);
console.log(`  GET  /api/events/analytics     - View analytics events tracked`);
console.log(`  GET  /api/events/audit         - View audit log`);
console.log(`\n🧪 Try it with curl:`);
console.log(`  # 1. Create a user (triggers USER_CREATED event)`);
console.log(`  curl -X POST http://localhost:${port}/api/users/ \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"email":"test@example.com","username":"testuser"}'`);
console.log(``);
console.log(`  # 2. Check notifications`);
console.log(`  curl http://localhost:${port}/api/events/notifications`);
console.log(``);
console.log(`  # 3. Check analytics`);
console.log(`  curl http://localhost:${port}/api/events/analytics`);
console.log(``);
console.log(`  # 4. Check audit log (wildcard events)`);
console.log(`  curl http://localhost:${port}/api/events/audit`);
console.log(``);
console.log(`  # 5. Create an order`);
console.log(`  curl -X POST http://localhost:${port}/api/orders/ \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"userId":"user-1","items":[{"name":"Product A","price":99.99}]}'`);
console.log(``);
console.log(`  # 6. Update a user`);
console.log(`  curl -X POST http://localhost:${port}/api/users/user-1/update \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"username":"updateduser"}'`);
console.log(``);
console.log(`  # 7. Get all users`);
console.log(`  curl http://localhost:${port}/api/users/`);
