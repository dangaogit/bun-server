import type { Context } from '../core/context';
import { Route } from './route';
import type { HttpMethod, RouteHandler, RouteMatch } from './types';
import type { Middleware } from '../middleware';

/**
 * 路由器类
 * 管理所有路由，提供路由注册和匹配功能
 */
export class Router {
  /**
   * 路由列表
   */
  private readonly routes: Route[] = [];
  private readonly staticRoutes = new Map<string, Route>();
  private readonly dynamicRoutes: Route[] = [];
  
  /**
   * 路由匹配结果缓存（method:path -> { route, match }）
   * 用于避免重复匹配，提升性能
   */
  private readonly matchCache = new Map<string, { route: Route; match: RouteMatch }>();

  /**
   * 规范化路径（移除尾部斜杠，除非是根路径）
   */
  private normalizePath(path: string): string {
    if (path.length > 1 && path.endsWith('/')) {
      return path.slice(0, -1);
    }
    return path;
  }

  /**
   * 注册路由
   * @param method - HTTP 方法
   * @param path - 路由路径
   * @param handler - 路由处理器
   * @param middlewares - 中间件列表
   * @param controllerClass - 控制器类（可选）
   * @param methodName - 方法名（可选）
   */
  public register(
    method: HttpMethod,
    path: string,
    handler: RouteHandler,
    middlewares: Middleware[] = [],
    controllerClass?: new (...args: unknown[]) => unknown,
    methodName?: string,
  ): void {
    // 规范化路径
    const normalizedPath = this.normalizePath(path);
    const route = new Route(method, normalizedPath, handler, middlewares, controllerClass, methodName);
    this.routes.push(route);
    const staticKey = route.getStaticKey();
    if (staticKey) {
      this.staticRoutes.set(staticKey, route);
    } else {
      this.dynamicRoutes.push(route);
    }
    
    // 清除匹配缓存，因为路由已更新
    this.matchCache.clear();
  }

  /**
   * 注册 GET 路由
   * @param path - 路由路径
   * @param handler - 路由处理器
   */
  public get(path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
    this.register('GET', path, handler, middlewares);
  }

  /**
   * 注册 POST 路由
   * @param path - 路由路径
   * @param handler - 路由处理器
   */
  public post(path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
    this.register('POST', path, handler, middlewares);
  }

  /**
   * 注册 PUT 路由
   * @param path - 路由路径
   * @param handler - 路由处理器
   */
  public put(path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
    this.register('PUT', path, handler, middlewares);
  }

  /**
   * 注册 DELETE 路由
   * @param path - 路由路径
   * @param handler - 路由处理器
   */
  public delete(path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
    this.register('DELETE', path, handler, middlewares);
  }

  /**
   * 注册 PATCH 路由
   * @param path - 路由路径
   * @param handler - 路由处理器
   */
  public patch(path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
    this.register('PATCH', path, handler, middlewares);
  }

  /**
   * 查找匹配的路由
   * @param method - HTTP 方法
   * @param path - 请求路径
   * @returns 匹配的路由，如果没有找到则返回 undefined
   */
  public findRoute(method: HttpMethod, path: string): Route | undefined {
    const result = this.findRouteWithMatch(method, path);
    return result?.route;
  }

  /**
   * 查找匹配的路由并返回匹配结果（包含参数）
   * @param method - HTTP 方法
   * @param path - 请求路径
   * @returns 匹配结果，包含路由和参数，如果没有找到则返回 undefined
   */
  public findRouteWithMatch(method: HttpMethod, path: string): { route: Route; match: RouteMatch } | undefined {
    const cacheKey = `${method}:${path}`;
    
    // 检查缓存（只缓存匹配成功的结果）
    const cached = this.matchCache.get(cacheKey);
    if (cached && cached.match.matched) {
      return cached;
    }

    // 先检查静态路由
    const staticRoute = this.staticRoutes.get(cacheKey);
    if (staticRoute) {
      const match = { matched: true, params: {} };
      const result = { route: staticRoute, match };
      this.matchCache.set(cacheKey, result);
      return result;
    }

    // 遍历动态路由
    for (const route of this.dynamicRoutes) {
      const match = route.match(method, path);
      if (match.matched) {
        const result = { route, match };
        // 缓存匹配结果
        this.matchCache.set(cacheKey, result);
        return result;
      }
    }
    
    // 不缓存未匹配结果，因为路由可能会动态添加
    return undefined;
  }

  /**
   * 预处理请求：仅匹配路由并设置路径参数 / routeHandler，但不执行处理器
   * 供安全过滤器等中间件在真正执行前基于路由元数据做鉴权
   */
  public async preHandle(context: Context): Promise<void> {
    const method = context.method as HttpMethod;
    const path = this.normalizePath(context.path);

    // 使用 findRouteWithMatch 避免重复匹配
    const result = this.findRouteWithMatch(method, path);
    if (!result) {
      return;
    }

    const { route, match } = result;
    if (match.matched) {
      context.params = match.params;
    }

    if (route.controllerClass && route.methodName) {
      (context as any).routeHandler = {
        controller: route.controllerClass,
        method: route.methodName,
      };
    }
  }

  /**
   * 处理请求（包含路由匹配 + 执行）
   * @param context - 请求上下文
   * @returns 响应对象，如果没有匹配的路由则返回 undefined
   */
  public async handle(context: Context): Promise<Response | undefined> {
    const method = context.method as HttpMethod;
    const path = this.normalizePath(context.path);

    // 使用 findRouteWithMatch 获取路由和匹配结果
    const result = this.findRouteWithMatch(method, path);
    if (!result) {
      return undefined;
    }

    const { route, match } = result;
    
    // 设置路径参数
    if (match.matched) {
      context.params = match.params;
    }

    // 设置 routeHandler
    if (route.controllerClass && route.methodName) {
      (context as any).routeHandler = {
        controller: route.controllerClass,
        method: route.methodName,
      };
    }

    return await route.execute(context);
  }

  /**
   * 获取所有路由
   * @returns 路由列表
   */
  public getRoutes(): readonly Route[] {
    return this.routes;
  }

  /**
   * 清除所有已注册路由（主要用于测试环境）
   */
  public clear(): void {
    this.routes.length = 0;
    this.dynamicRoutes.length = 0;
    this.staticRoutes.clear();
    this.matchCache.clear();
  }
}

