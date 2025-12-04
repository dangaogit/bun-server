import type { Context } from '../core/context';

/**
 * 中间件 Next 函数
 */
export type NextFunction = () => Promise<Response>;

/**
 * 中间件接口
 */
export type Middleware = (context: Context, next: NextFunction) => Promise<Response> | Response;


