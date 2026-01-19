
import {
  Application,
  Body,
  CONFIG_SERVICE_TOKEN,
  ConfigModule,
  ConfigService,
  Controller,
  createLoggerMiddleware,
  GET,
  Inject,
  Injectable,
  IsNumber,
  IsString,
  LOGGER_TOKEN,
  LoggerExtension,
  LogLevel,
  Module,
  Param,
  POST,
  Validate,
} from "@dangao/bun-server";
import type { Logger } from "@dangao/logsmith";

// ==================== User Module ====================

@Injectable()
class UserService {
  private readonly users = new Map<string, { id: string; name: string; email: string }>([
    ["1", { id: "1", name: "Alice", email: "alice@example.com" }],
    ["2", { id: "2", name: "Bob", email: "bob@example.com" }],
  ]);

  /**
   * 查找用户
   */
  public findById(id: string) {
    return this.users.get(id);
  }

  /**
   * 创建用户
   */
  public create(name: string, email: string) {
    const id = String(this.users.size + 1);
    const user = { id, name, email };
    this.users.set(id, user);
    return user;
  }

  /**
   * 获取所有用户
   */
  public findAll() {
    return Array.from(this.users.values());
  }
}

@Controller("/api/users")
class UserController {
  public constructor(
    @Inject(UserService) private readonly userService: UserService,
    @Inject(LOGGER_TOKEN) private readonly logger: Logger,
  ) {}

  @GET("/")
  public listUsers() {
    this.logger.info("List all users");
    return this.userService.findAll();
  }

  @GET("/:id")
  public getUser(@Param("id") id: string) {
    this.logger.info("Get user", { id });
    const user = this.userService.findById(id);
    if (!user) {
      return { error: "User not found" };
    }
    return user;
  }

  @POST("/")
  public createUser(
    @Body("name") @Validate(IsString()) name: string,
    @Body("email") @Validate(IsString()) email: string,
  ) {
    this.logger.info("Create user", { name, email });
    return this.userService.create(name, email);
  }
}

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // 导出 UserService 供其他模块使用
})
class UserModule {}

// ==================== Product Module ====================

@Injectable()
class ProductService {
  private readonly products = new Map<string, { id: string; name: string; price: number }>([
    ["1", { id: "1", name: "Laptop", price: 999.99 }],
    ["2", { id: "2", name: "Mouse", price: 29.99 }],
  ]);

  /**
   * 查找产品
   */
  public findById(id: string) {
    return this.products.get(id);
  }

  /**
   * 创建产品
   */
  public create(name: string, price: number) {
    const id = String(this.products.size + 1);
    const product = { id, name, price };
    this.products.set(id, product);
    return product;
  }

  /**
   * 获取所有产品
   */
  public findAll() {
    return Array.from(this.products.values());
  }

  /**
   * 检查产品是否存在
   */
  public exists(id: string): boolean {
    return this.products.has(id);
  }
}

@Controller("/api/products")
class ProductController {
  public constructor(
    @Inject(ProductService) private readonly productService: ProductService,
    @Inject(LOGGER_TOKEN) private readonly logger: Logger,
  ) {}

  @GET("/")
  public listProducts() {
    this.logger.info("List all products");
    return this.productService.findAll();
  }

  @GET("/:id")
  public getProduct(@Param("id") id: string) {
    this.logger.info("Get product", { id });
    const product = this.productService.findById(id);
    if (!product) {
      return { error: "Product not found" };
    }
    return product;
  }

  @POST("/")
  public createProduct(
    @Body("name") @Validate(IsString()) name: string,
    @Body("price") @Validate(IsNumber()) price: number,
  ) {
    this.logger.info("Create product", { name, price });
    return this.productService.create(name, price);
  }
}

@Module({
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService], // 导出 ProductService 供其他模块使用
})
class ProductModule {}

// ==================== Order Module (依赖 User 和 Product) ====================

@Injectable()
class OrderService {
  private readonly orders = new Map<string, { id: string; userId: string; productId: string; quantity: number }>();

  public constructor(
    private readonly userService: UserService,
    private readonly productService: ProductService,
    private readonly logger: Logger,
  ) {}

  /**
   * 创建订单
   */
  public create(userId: string, productId: string, quantity: number) {
    // 验证用户是否存在
    const user = this.userService.findById(userId);
    if (!user) {
      throw new Error(`User ${userId} not found`);
    }

    // 验证产品是否存在
    if (!this.productService.exists(productId)) {
      throw new Error(`Product ${productId} not found`);
    }

    const id = String(this.orders.size + 1);
    const order = { id, userId, productId, quantity };
    this.orders.set(id, order);

    this.logger.info("Order created", { orderId: id, userId, productId, quantity });
    return order;
  }

  /**
   * 查找订单
   */
  public findById(id: string) {
    return this.orders.get(id);
  }

  /**
   * 获取用户的所有订单
   */
  public findByUserId(userId: string) {
    return Array.from(this.orders.values()).filter((order) => order.userId === userId);
  }

  /**
   * 获取所有订单
   */
  public findAll() {
    return Array.from(this.orders.values());
  }
}

@Controller("/api/orders")
class OrderController {
  public constructor(
    private readonly orderService: OrderService,
    @Inject(LOGGER_TOKEN) private readonly logger: Logger,
  ) {}

  @GET("/")
  public listOrders() {
    this.logger.info("List all orders");
    return this.orderService.findAll();
  }

  @GET("/:id")
  public getOrder(@Param("id") id: string) {
    this.logger.info("Get order", { id });
    const order = this.orderService.findById(id);
    if (!order) {
      return { error: "Order not found" };
    }
    return order;
  }

  @GET("/user/:userId")
  public getUserOrders(@Param("userId") userId: string) {
    this.logger.info("Get user orders", { userId });
    return this.orderService.findByUserId(userId);
  }

  @POST("/")
  public createOrder(
    @Body("userId") @Validate(IsString()) userId: string,
    @Body("productId") @Validate(IsString()) productId: string,
    @Body("quantity") @Validate(IsNumber()) quantity: number,
  ) {
    this.logger.info("Create order", { userId, productId, quantity });
    try {
      return this.orderService.create(userId, productId, quantity);
    } catch (error) {
      return { error: (error as Error).message };
    }
  }
}

@Module({
  imports: [UserModule, ProductModule], // 导入 UserModule 和 ProductModule
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
class OrderModule {}

// ==================== Application Setup ====================

ConfigModule.forRoot({
  defaultConfig: {
    app: {
      port: Number(process.env.PORT ?? 3300),
    },
    logger: {
      prefix: "MultiModuleExample",
      level: LogLevel.DEBUG,
    },
  },
});

const app = new Application();
app.registerModule(ConfigModule);

const config = app
  .getContainer()
  .resolve<ConfigService>(CONFIG_SERVICE_TOKEN);

const port =
  config.get<number>("app.port", Number(process.env.PORT ?? 3300)) ?? 3300;

// 注册日志扩展
const loggerPrefix = config.get<string>("logger.prefix", "MultiModuleExample")!;
const loggerLevel = config.get<LogLevel>("logger.level", LogLevel.DEBUG)!;

app.registerExtension(
  new LoggerExtension({
    prefix: loggerPrefix,
    level: loggerLevel,
  }),
);

// 注册中间件
app.use(createLoggerMiddleware({ prefix: `[${loggerPrefix}]` }));

// 注册模块（只需要注册 OrderModule，因为它已经导入了 UserModule 和 ProductModule）
// 或者可以分别注册所有模块
app.registerModule(UserModule);
app.registerModule(ProductModule);
app.registerModule(OrderModule);

app.listen(port);

console.log(`🚀 Multi-module app running on http://localhost:${port}`);
console.log(`📚 API endpoints:`);
console.log(`   GET  /api/users - List all users`);
console.log(`   GET  /api/users/:id - Get user by ID`);
console.log(`   POST /api/users - Create user`);
console.log(`   GET  /api/products - List all products`);
console.log(`   GET  /api/products/:id - Get product by ID`);
console.log(`   POST /api/products - Create product`);
console.log(`   GET  /api/orders - List all orders`);
console.log(`   GET  /api/orders/:id - Get order by ID`);
console.log(`   GET  /api/orders/user/:userId - Get orders by user ID`);
console.log(`   POST /api/orders - Create order`);

