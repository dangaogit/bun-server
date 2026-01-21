/**
 * 全局模块示例
 *
 * 本示例演示如何使用 @Global() 装饰器创建全局模块。
 * 全局模块的导出可以在任何其他模块中使用，无需显式导入。
 *
 * 运行: bun run examples/01-basic/global-module-app.ts
 */

import {
  Application,
  Controller,
  GET,
  Module,
  Injectable,
  Inject,
  Global,
  Param,
} from '../../packages/bun-server/src';

// ============================================================
// 1. 全局配置模块
// ============================================================

const CONFIG_TOKEN = Symbol('config');

interface AppConfig {
  appName: string;
  version: string;
  environment: string;
}

/**
 * 配置服务 - 提供应用配置
 */
@Injectable()
class ConfigService {
  private readonly config: AppConfig = {
    appName: 'Global Module Demo',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  public get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.config[key];
  }

  public getAll(): AppConfig {
    return { ...this.config };
  }
}

/**
 * 全局配置模块
 * 使用 @Global() 装饰器标记为全局模块
 * 其他模块无需导入即可使用 ConfigService
 */
@Global()
@Module({
  providers: [
    {
      provide: CONFIG_TOKEN,
      useClass: ConfigService,
    },
  ],
  exports: [CONFIG_TOKEN],
})
class GlobalConfigModule {}

// ============================================================
// 2. 全局日志模块
// ============================================================

const LOGGER_TOKEN = Symbol('logger');

/**
 * 日志服务 - 提供日志记录功能
 */
@Injectable()
class LoggerService {
  private readonly prefix: string;

  public constructor() {
    this.prefix = '[App]';
  }

  public info(message: string): void {
    console.log(`${this.prefix} [INFO] ${new Date().toISOString()} - ${message}`);
  }

  public warn(message: string): void {
    console.log(`${this.prefix} [WARN] ${new Date().toISOString()} - ${message}`);
  }

  public error(message: string): void {
    console.log(`${this.prefix} [ERROR] ${new Date().toISOString()} - ${message}`);
  }
}

/**
 * 全局日志模块
 */
@Global()
@Module({
  providers: [
    {
      provide: LOGGER_TOKEN,
      useClass: LoggerService,
    },
  ],
  exports: [LOGGER_TOKEN],
})
class GlobalLoggerModule {}

// ============================================================
// 3. 用户模块 - 无需导入全局模块即可使用其服务
// ============================================================

/**
 * 用户服务
 * 直接注入全局模块导出的 ConfigService 和 LoggerService
 * 无需在 UserModule 中导入 GlobalConfigModule 和 GlobalLoggerModule
 */
@Injectable()
class UserService {
  public constructor(
    @Inject(CONFIG_TOKEN) private readonly config: ConfigService,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  public getUsers(): { id: string; name: string }[] {
    this.logger.info('Fetching users list');
    return [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' },
    ];
  }

  public getUserById(id: string): { id: string; name: string } | undefined {
    this.logger.info(`Fetching user with id: ${id}`);
    return this.getUsers().find(u => u.id === id);
  }

  public getAppInfo(): { appName: string; version: string } {
    return {
      appName: this.config.get('appName'),
      version: this.config.get('version'),
    };
  }
}

@Controller('/users')
class UserController {
  public constructor(@Inject(UserService) private readonly userService: UserService) {}

  @GET('/')
  public getUsers(): { id: string; name: string }[] {
    return this.userService.getUsers();
  }

  @GET('/:id')
  public getUserById(@Param('id') id: string): { id: string; name: string } | { error: string } {
    const user = this.userService.getUserById(id);
    if (!user) {
      return { error: `User ${id} not found` };
    }
    return user;
  }

  @GET('/app-info')
  public getAppInfo(): { appName: string; version: string } {
    return this.userService.getAppInfo();
  }
}

/**
 * 用户模块
 * 注意：不需要导入 GlobalConfigModule 或 GlobalLoggerModule
 * 因为它们是全局模块，其导出可以直接使用
 */
@Module({
  controllers: [UserController],
  providers: [UserService],
})
class UserModule {}

// ============================================================
// 4. 产品模块 - 另一个使用全局服务的模块
// ============================================================

@Injectable()
class ProductService {
  public constructor(
    @Inject(CONFIG_TOKEN) private readonly config: ConfigService,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  public getProducts(): { id: string; name: string; price: number }[] {
    this.logger.info('Fetching products list');
    return [
      { id: 'p1', name: 'Laptop', price: 999 },
      { id: 'p2', name: 'Phone', price: 699 },
      { id: 'p3', name: 'Tablet', price: 499 },
    ];
  }

  public getEnvironment(): string {
    return this.config.get('environment');
  }
}

@Controller('/products')
class ProductController {
  public constructor(@Inject(ProductService) private readonly productService: ProductService) {}

  @GET('/')
  public getProducts(): { id: string; name: string; price: number }[] {
    return this.productService.getProducts();
  }

  @GET('/environment')
  public getEnvironment(): { environment: string } {
    return { environment: this.productService.getEnvironment() };
  }
}

/**
 * 产品模块
 * 同样不需要导入全局模块
 */
@Module({
  controllers: [ProductController],
  providers: [ProductService],
})
class ProductModule {}

// ============================================================
// 5. 主模块 - 只需导入全局模块一次
// ============================================================

@Controller('/')
class AppController {
  @GET('/')
  public home(): { message: string; endpoints: string[] } {
    return {
      message: 'Welcome to Global Module Demo',
      endpoints: [
        'GET /users - List all users',
        'GET /users/:id - Get user by ID',
        'GET /users/app-info - Get app info',
        'GET /products - List all products',
        'GET /products/environment - Get current environment',
      ],
    };
  }
}

/**
 * 主模块
 * 全局模块只需在根模块注册一次
 */
@Module({
  imports: [
    GlobalConfigModule,  // 注册全局配置模块
    GlobalLoggerModule,  // 注册全局日志模块
    UserModule,
    ProductModule,
  ],
  controllers: [AppController],
})
class AppModule {}

// ============================================================
// 启动应用
// ============================================================

const app = new Application();
app.registerModule(AppModule);

const port = 3000;
app.listen(port);

console.log(`
========================================
  Global Module Demo App
========================================

Server running at http://localhost:${port}

Available endpoints:
  GET /                    - Home (list all endpoints)
  GET /users               - List all users
  GET /users/:id           - Get user by ID
  GET /users/app-info      - Get app info (from global ConfigService)
  GET /products            - List all products
  GET /products/environment - Get current environment

Key points:
  - GlobalConfigModule and GlobalLoggerModule are marked with @Global()
  - UserModule and ProductModule don't import these global modules
  - Yet they can inject ConfigService and LoggerService directly

Press Ctrl+C to stop the server.
`);
