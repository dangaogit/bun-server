import type { Context } from '../core/context';
import type { Constructor } from '../core/types';
import type { HttpMethod, RouteHandler, RouteMatch } from './types';
import { MiddlewarePipeline } from '../middleware/pipeline';
import type { Middleware } from '../middleware';

/**
 * 路由类
 * 表示一个路由定义
 */
export class Route {
  /**
   * HTTP 方法
   */
  public readonly method: HttpMethod;

  /**
   * 路由路径（支持参数，如 /users/:id）
   */
  public readonly path: string;

  /**
   * 路由处理器
   */
  public readonly handler: RouteHandler;

  /**
   * 控制器类（可选，用于控制器路由）
   */
  public readonly controllerClass?: Constructor<unknown>;

  /**
   * 方法名（可选，用于控制器路由）
   */
  public readonly methodName?: string;

  /**
   * 动态路由匹配用正则（比 URLPattern.exec() 快约 10 倍）
   */
  private readonly pattern?: RegExp;

  /**
   * 动态路由参数名列表
   */
  private readonly paramNames?: string[];

  private readonly middlewarePipeline: MiddlewarePipeline | null;
  private readonly staticKey?: string;
  public readonly isStatic: boolean;

  public constructor(
    method: HttpMethod,
    path: string,
    handler: RouteHandler,
    middlewares: Middleware[] = [],
    controllerClass?: Constructor<unknown>,
    methodName?: string,
  ) {
    this.method = method;
    this.path = path;
    this.handler = handler;
    this.controllerClass = controllerClass;
    this.methodName = methodName;

    this.isStatic = !path.includes(':') && !path.includes('*');
    if (this.isStatic) {
      this.staticKey = `${method}:${path}`;
    } else {
      const { pattern, paramNames } = Route.parsePath(path);
      this.pattern = pattern;
      this.paramNames = paramNames;
    }
    this.middlewarePipeline = middlewares.length > 0 ? new MiddlewarePipeline(middlewares) : null;
  }

  /**
   * 解析路径，生成匹配模式和参数名列表
   */
  private static parsePath(path: string): { pattern: RegExp; paramNames: string[] } {
    const paramNames: string[] = [];
    const patternString = path
      .replace(/:([^/]+)/g, (_, paramName) => {
        paramNames.push(paramName);
        return '([^/]+)';
      })
      .replace(/\*/g, '.*');

    return { pattern: new RegExp(`^${patternString}$`), paramNames };
  }

  /**
   * 匹配路由
   * @param method - HTTP 方法
   * @param path - 请求路径
   * @returns 匹配结果
   */
  public match(method: HttpMethod, path: string): RouteMatch {
    if (this.method !== method) {
      return { matched: false, params: {} };
    }

    if (this.isStatic) {
      return path === this.path
        ? { matched: true, params: {} }
        : { matched: false, params: {} };
    }

    const match = path.match(this.pattern!);
    if (!match) {
      return { matched: false, params: {} };
    }

    const params: Record<string, string> = {};
    for (let i = 0; i < this.paramNames!.length; i++) {
      params[this.paramNames![i]] = match[i + 1] ?? '';
    }

    return { matched: true, params };
  }

  /**
   * 执行路由处理器
   * @param context - 请求上下文
   * @returns 响应对象
   */
  public async execute(context: Context): Promise<Response> {
    if (!this.middlewarePipeline || !this.middlewarePipeline.hasMiddlewares()) {
      return await this.handler(context);
    }

    return await this.middlewarePipeline.run(context, async () => this.handler(context));
  }

  /**
   * 获取静态路由缓存 key
   */
  public getStaticKey(): string | undefined {
    return this.staticKey;
  }
}

