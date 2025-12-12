import { BunServer, type ServerOptions } from './server';
import { Context } from './context';
import { RouteRegistry } from '../router/registry';
import { ControllerRegistry } from '../controller/controller';
import { MiddlewarePipeline } from '../middleware/pipeline';
import type { Middleware } from '../middleware';
import { createErrorHandlingMiddleware } from '../middleware';
import { WebSocketGatewayRegistry } from '../websocket/registry';
import type { ApplicationExtension } from '../extensions/types';
import { LoggerExtension } from '../extensions/logger-extension';
import { ModuleRegistry } from '../di/module-registry';
import type { ModuleClass } from '../di/module';
import type { Constructor } from './types';
import { InterceptorRegistry, INTERCEPTOR_REGISTRY_TOKEN } from '../interceptor';

/**
 * 应用配置选项
 */
export interface ApplicationOptions {
  /**
   * 端口号
   */
  port?: number;

  /**
   * 主机名
   */
  hostname?: string;
}

/**
 * 应用主类
 * 负责初始化和启动应用
 */
export class Application {
  private server?: BunServer;
  private readonly options: ApplicationOptions;
  private readonly middlewarePipeline: MiddlewarePipeline;
  private readonly websocketRegistry: WebSocketGatewayRegistry;
  private readonly extensions: ApplicationExtension[] = [];

  public constructor(options: ApplicationOptions = {}) {
    this.options = options;
    this.middlewarePipeline = new MiddlewarePipeline([createErrorHandlingMiddleware()]);
    this.websocketRegistry = WebSocketGatewayRegistry.getInstance();

    // 每个应用实例使用前先清空全局注册表，避免不同应用之间互相污染
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
    ModuleRegistry.getInstance().clear();

    // 注册 InterceptorRegistry 到 DI 容器
    const container = ControllerRegistry.getInstance().getContainer();
    const interceptorRegistry = new InterceptorRegistry();
    container.registerInstance(INTERCEPTOR_REGISTRY_TOKEN, interceptorRegistry);

    // 默认注册 Logger（如果通过模块注册，会被覆盖）
    this.registerExtension(new LoggerExtension());
  }

  /**
   * 注册全局中间件
   * @param middleware - 中间件函数
   */
  public use(middleware: Middleware): void {
    this.middlewarePipeline.use(middleware);
  }

  /**
   * 启动应用
   */
  public async listen(port?: number, hostname?: string): Promise<void> {
    if (this.server?.isRunning()) {
      throw new Error('Application is already running');
    }

    // 初始化所有扩展（包括数据库连接等）
    await this.initializeExtensions();

    const serverOptions: ServerOptions = {
      port: port ?? this.options.port ?? 3000,
      hostname: hostname ?? this.options.hostname,
      fetch: this.handleRequest.bind(this),
      websocketRegistry: this.websocketRegistry,
    };

    this.server = new BunServer(serverOptions);
    this.server.start();
  }

  /**
   * 初始化所有扩展
   */
  private async initializeExtensions(): Promise<void> {
    const container = this.getContainer();
    
    // 初始化应用级别的扩展
    for (const extension of this.extensions) {
      // 如果扩展有 initialize 方法，调用它
      if (
        extension &&
        typeof extension === 'object' &&
        'initialize' in extension &&
        typeof extension.initialize === 'function'
      ) {
        await extension.initialize(container);
      }
    }

    // 初始化模块中的扩展（通过已注册的扩展列表）
    // 模块扩展已经在 registerModule 时添加到 this.extensions
    // 所以上面的循环已经处理了
  }

  /**
   * 停止应用
   */
  public async stop(): Promise<void> {
    // 关闭所有扩展（包括数据库连接等）
    await this.closeExtensions();
    this.server?.stop();
  }

  /**
   * 关闭所有扩展
   */
  private async closeExtensions(): Promise<void> {
    const container = this.getContainer();

    // 关闭所有扩展（包括模块扩展，因为它们已经在 registerModule 时添加到 this.extensions）
    // 按相反顺序关闭，确保依赖关系正确
    for (let i = this.extensions.length - 1; i >= 0; i--) {
      const extension = this.extensions[i];
      if (
        extension &&
        typeof extension === 'object' &&
        'close' in extension &&
        typeof extension.close === 'function'
      ) {
        await extension.close(container);
      }
    }
  }

  /**
   * 处理请求
   * @param context - 请求上下文
   * @returns 响应对象
   */
  private async handleRequest(context: Context): Promise<Response> {
    // 对于 POST、PUT、PATCH 请求，提前解析 body 并缓存
    // 这样可以确保 Request.body 流只读取一次
    if (['POST', 'PUT', 'PATCH'].includes(context.method)) {
      await context.getBody();
    }

    // 先通过路由解析出处理器信息，便于安全中间件等基于路由元数据做决策
    const registry = RouteRegistry.getInstance();
    const router = registry.getRouter();

    // 预解析路由，仅设置上下文信息，不执行处理器
    await router.preHandle(context);

    // 再进入中间件管道，由中间件（如安全过滤器）根据 routeHandler 和 Auth 元数据做校验，
    // 最后再由路由真正执行控制器方法
    return await this.middlewarePipeline.run(context, async () => {
      const response = await router.handle(context);
      if (response) {
        return response;
      }

      context.setStatus(404);
      return context.createResponse({ error: 'Not Found' });
    });
  }

  /**
   * 注册控制器
   * @param controllerClass - 控制器类
   */
  public registerController(controllerClass: Constructor<unknown>): void {
    const registry = ControllerRegistry.getInstance();
    registry.register(controllerClass);
  }

  /**
   * 注册模块
   * @param moduleClass - 模块类
   */
  public registerModule(moduleClass: ModuleClass): void {
    const registry = ModuleRegistry.getInstance();
    registry.register(moduleClass, this.getContainer());
    
    // 注册模块的扩展和中间件
    const extensions = registry.getModuleExtensions(moduleClass);
    for (const extension of extensions) {
      this.registerExtension(extension);
    }
    
    const middlewares = registry.getModuleMiddlewares(moduleClass);
    for (const middleware of middlewares) {
      this.use(middleware);
    }
  }

  /**
   * 注册 WebSocket 网关
   * @param gatewayClass - WebSocket 网关类
   */
  public registerWebSocketGateway(gatewayClass: Constructor<unknown>): void {
    this.websocketRegistry.register(gatewayClass);
  }

  /**
   * 注册扩展
   * @param extension - 应用扩展
   */
  public registerExtension(extension: ApplicationExtension): void {
    this.extensions.push(extension);
    extension.register(this.getContainer());
  }

  /**
   * 获取服务器实例
   * @returns Bun Server 实例
   */
  public getServer(): BunServer | undefined {
    return this.server;
  }

  /**
   * 获取 DI 容器（用于注册服务）
   * @returns DI 容器
   */
  public getContainer() {
    return ControllerRegistry.getInstance().getContainer();
  }
}

