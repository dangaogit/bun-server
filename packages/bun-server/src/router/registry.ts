import { Router } from './router';
import type { HttpMethod, RouteHandler } from './types';
import type { Middleware } from '../middleware';

/**
 * 路由注册表
 * 全局路由注册表，管理所有路由
 */
export class RouteRegistry {
  private static instance: RouteRegistry;
  private readonly router: Router;

  private constructor() {
    this.router = new Router();
  }

  /**
   * 获取单例实例
   * @returns 路由注册表实例
   */
  public static getInstance(): RouteRegistry {
    if (!RouteRegistry.instance) {
      RouteRegistry.instance = new RouteRegistry();
    }
    return RouteRegistry.instance;
  }

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
    this.router.register(method, path, handler, middlewares);
  }

  /**
   * 注册 GET 路由
   */
  public get(path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
    this.router.get(path, handler, middlewares);
  }

  /**
   * 注册 POST 路由
   */
  public post(path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
    this.router.post(path, handler, middlewares);
  }

  /**
   * 注册 PUT 路由
   */
  public put(path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
    this.router.put(path, handler, middlewares);
  }

  /**
   * 注册 DELETE 路由
   */
  public delete(path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
    this.router.delete(path, handler, middlewares);
  }

  /**
   * 注册 PATCH 路由
   */
  public patch(path: string, handler: RouteHandler, middlewares: Middleware[] = []): void {
    this.router.patch(path, handler, middlewares);
  }

  /**
   * 获取路由器实例
   * @returns 路由器实例
   */
  public getRouter(): Router {
    return this.router;
  }

  /**
   * 清除所有路由（主要用于测试）
   */
  public clear(): void {
    this.router.clear();
  }
}

