import { BunServer, type ServerOptions } from './server';
import { Context } from './context';
import { contextStore, ContextService, CONTEXT_SERVICE_TOKEN } from './context-service';
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
import { CONFIG_SERVICE_TOKEN } from '../config/types';
import { ConfigService } from '../config/service';
import { ConfigModule } from '../config/config-module';
import { CacheModule, CACHE_POST_PROCESSOR_TOKEN } from '../cache';
import { LoggerManager } from '@dangao/logsmith';

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

  /**
   * 优雅停机超时时间（毫秒）
   * 默认 30 秒
   */
  gracefulShutdownTimeout?: number;

  /**
   * 是否启用信号监听（SIGTERM、SIGINT）
   * 默认 true
   */
  enableSignalHandlers?: boolean;
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
  private signalHandlersInstalled: boolean = false;

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

    // 自动注册 ContextService
    container.registerInstance(CONTEXT_SERVICE_TOKEN, new ContextService());

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

    // 初始化配置中心集成（在所有模块注册完成后）
    await this.initializeConfigCenter();

    const finalPort = port ?? this.options.port ?? 3000;
    const finalHostname = hostname ?? this.options.hostname;

    const serverOptions: ServerOptions = {
      port: finalPort,
      hostname: finalHostname,
      fetch: this.handleRequest.bind(this),
      websocketRegistry: this.websocketRegistry,
      gracefulShutdownTimeout: this.options.gracefulShutdownTimeout,
    };

    this.server = new BunServer(serverOptions);
    this.server.start();

    // 安装信号处理器（如果启用）
    if (this.options.enableSignalHandlers !== false) {
      this.installSignalHandlers();
    }

    // 自动注册服务到注册中心（如果使用了 @ServiceRegistry 装饰器）
    await this.registerServices(finalPort, finalHostname);
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
   * 初始化配置中心集成
   * 在所有模块注册完成后调用，确保 ConfigCenterModule 已注册
   */
  private async initializeConfigCenter(): Promise<void> {
    const container = this.getContainer();
    // ConfigModule 可能未注册（很多测试/应用不使用配置模块），此时不要抛错
    if (!container.isRegistered(CONFIG_SERVICE_TOKEN)) {
      return;
    }

    const configService = container.resolve<ConfigService>(CONFIG_SERVICE_TOKEN);

    // 检查是否有待初始化的配置中心选项
    const configCenterOptions = (configService as any)._configCenterOptions;
    if (configCenterOptions) {
      try {
        await ConfigModule.initializeConfigCenter(configService, configCenterOptions);
        // 清除临时选项
        delete (configService as any)._configCenterOptions;
      } catch (error) {
        console.error(
          '[Application] Failed to initialize config center:',
          error,
        );
      }
    }
  }

  /**
   * 停止应用（立即停止，不等待请求完成）
   */
  public async stop(): Promise<void> {
    // 移除信号处理器
    this.removeSignalHandlers();

    // 自动注销服务（如果使用了 @ServiceRegistry 装饰器）
    await this.deregisterServices();

    // 关闭所有扩展（包括数据库连接等）
    await this.closeExtensions();
    this.server?.stop();
  }

  /**
   * 优雅停机
   * 停止接受新请求，等待正在处理的请求完成，然后关闭应用
   * @param timeout - 超时时间（毫秒），默认使用配置的 gracefulShutdownTimeout 或 30000
   * @returns Promise，在停机完成时 resolve
   */
  public async gracefulShutdown(timeout?: number): Promise<void> {
    // 移除信号处理器
    this.removeSignalHandlers();

    // 自动注销服务（如果使用了 @ServiceRegistry 装饰器）
    await this.deregisterServices();

    // 关闭所有扩展（包括数据库连接等）
    await this.closeExtensions();

    // 优雅关闭服务器
    if (this.server) {
      await this.server.gracefulShutdown(timeout);
    }
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
    const logger = LoggerManager.getLogger();
    logger.debug('[Request] Incoming', {
      method: context.method,
      path: context.path,
      url: context.url?.href,
    });

    // 使用 AsyncLocalStorage 包裹请求处理，确保所有中间件和控制器都在请求上下文中执行
    return await contextStore.run(context, async () => {
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

        logger.debug('[Router] No route matched', {
          method: context.method,
          path: context.path,
        });
        context.setStatus(404);
        return context.createResponse({ error: 'Not Found' });
      });
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
    const container = this.getContainer();
    registry.register(moduleClass, container);
    
    // 注册模块的扩展和中间件
    const extensions = registry.getModuleExtensions(moduleClass);
    for (const extension of extensions) {
      this.registerExtension(extension);
    }
    
    const middlewares = registry.getModuleMiddlewares(moduleClass);
    for (const middleware of middlewares) {
      this.use(middleware);
    }

    // 检测并注册缓存后处理器
    // CacheModule.getPostProcessor() 会在 forRoot() 被调用后返回后处理器
    this.registerCachePostProcessorIfNeeded(container);
  }

  /**
   * 检测并注册缓存后处理器
   * @param container - DI 容器
   */
  private registerCachePostProcessorIfNeeded(container: ReturnType<typeof this.getContainer>): void {
    // 直接从 CacheModule 获取后处理器
    // 如果 CacheModule.forRoot() 被调用过，后处理器就会存在
    const postProcessor = CacheModule.getPostProcessor();
    if (postProcessor) {
      // 检查是否已经注册过（避免重复注册）
      // @ts-expect-error - 访问私有属性
      const existingProcessors = container.postProcessors as unknown[];
      if (!existingProcessors.includes(postProcessor)) {
        container.registerPostProcessor(postProcessor);
      }
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
   * 自动注册服务到注册中心
   * 扫描所有使用 @ServiceRegistry 装饰器的控制器，自动注册服务
   */
  private async registerServices(port: number, hostname?: string): Promise<void> {
    try {
      // 动态导入服务注册装饰器（避免循环依赖）
      const { registerServiceInstance } = await import(
        '../microservice/service-registry/decorators'
      );

      const registry = ControllerRegistry.getInstance();
      const controllers = registry.getRegisteredControllers();

      for (const controllerClass of controllers) {
        await registerServiceInstance(controllerClass, port, hostname);
      }
    } catch (error) {
      // 如果服务注册失败，不影响应用启动（可能是没有配置 ServiceRegistryModule）
      // 只在调试模式下输出警告
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Application] Failed to register services:', error);
      }
    }
  }

  /**
   * 自动注销服务
   * 注销所有使用 @ServiceRegistry 装饰器的服务
   */
  private async deregisterServices(): Promise<void> {
    try {
      // 动态导入服务注册装饰器（避免循环依赖）
      const { deregisterServiceInstance } = await import(
        '../microservice/service-registry/decorators'
      );

      const registry = ControllerRegistry.getInstance();
      const controllers = registry.getRegisteredControllers();

      const port = this.server?.getPort() ?? this.options.port ?? 3000;
      const hostname = this.server?.getHostname() ?? this.options.hostname;

      for (const controllerClass of controllers) {
        await deregisterServiceInstance(controllerClass, port, hostname);
      }
    } catch (error) {
      // 如果服务注销失败，不影响应用关闭
      if (process.env.NODE_ENV === 'development') {
        console.warn('[Application] Failed to deregister services:', error);
      }
    }
  }

  /**
   * 获取 DI 容器（用于注册服务）
   * @returns DI 容器
   */
  public getContainer() {
    return ControllerRegistry.getInstance().getContainer();
  }

  /**
   * 安装信号处理器（SIGTERM、SIGINT）
   */
  private installSignalHandlers(): void {
    if (this.signalHandlersInstalled) {
      return;
    }

    const logger = LoggerManager.getLogger();

    const shutdownHandler = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);
      try {
        await this.gracefulShutdown();
        process.exit(0);
      } catch (error) {
        logger.error(`Error during graceful shutdown:`, error);
        process.exit(1);
      }
    };

    // 监听 SIGTERM（通常由进程管理器发送）
    process.on('SIGTERM', () => shutdownHandler('SIGTERM'));

    // 监听 SIGINT（通常由 Ctrl+C 触发）
    process.on('SIGINT', () => shutdownHandler('SIGINT'));

    this.signalHandlersInstalled = true;
  }

  /**
   * 移除信号处理器
   */
  private removeSignalHandlers(): void {
    if (!this.signalHandlersInstalled) {
      return;
    }

    process.removeAllListeners('SIGTERM');
    process.removeAllListeners('SIGINT');
    this.signalHandlersInstalled = false;
  }
}

