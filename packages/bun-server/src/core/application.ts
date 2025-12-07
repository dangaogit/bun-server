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
import type { Constructor } from './types'

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
  public listen(port?: number, hostname?: string): void {
    if (this.server?.isRunning()) {
      throw new Error('Application is already running');
    }

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
   * 停止应用
   */
  public stop(): void {
    this.server?.stop();
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

    // 尝试通过中间件管道处理
    const registry = RouteRegistry.getInstance();
    const router = registry.getRouter();

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

