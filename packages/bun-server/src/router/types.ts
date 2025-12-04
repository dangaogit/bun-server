import type { Context } from '../core/context';

/**
 * HTTP 方法类型
 */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

/**
 * 路由处理器函数
 */
export type RouteHandler = (context: Context) => Response | Promise<Response>;

/**
 * 路由匹配结果
 */
export interface RouteMatch {
  /**
   * 是否匹配
   */
  matched: boolean;

  /**
   * 路径参数
   */
  params: Record<string, string>;
}

