import type { Context } from '../core/context';
import { Route } from './route';
import type { HttpMethod, RouteHandler } from './types';
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
   * 注册路由
   * @param method - HTTP 方法
   * @param path - 路由路径
   * @param handler - 路由处理器
   */
  public register(
    method: HttpMethod,
    path: string,
    handler: RouteHandler,
    middlewares: Middleware[] = [],
  ): void {
    const route = new Route(method, path, handler, middlewares);
    this.routes.push(route);
    const staticKey = route.getStaticKey();
    if (staticKey) {
      this.staticRoutes.set(staticKey, route);
    } else {
      this.dynamicRoutes.push(route);
    }
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
    const staticRoute = this.staticRoutes.get(`${method}:${path}`);
    if (staticRoute) {
      return staticRoute;
    }

    for (const route of this.dynamicRoutes) {
      const match = route.match(method, path);
      if (match.matched) {
        return route;
      }
    }
    return undefined;
  }

  /**
   * 处理请求
   * @param context - 请求上下文
   * @returns 响应对象，如果没有匹配的路由则返回 undefined
   */
  public async handle(context: Context): Promise<Response | undefined> {
    const method = context.method as HttpMethod;
    const route = this.findRoute(method, context.path);

    if (!route) {
      return undefined;
    }

    // 提取路径参数并设置到 context
    const match = route.match(method, context.path);
    if (match.matched) {
      context.params = match.params;
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
  }
}

