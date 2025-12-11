import type { Context } from '../core/context';
import type { Middleware, NextFunction } from './middleware';

/**
 * 中间件执行管道
 */
export class MiddlewarePipeline {
  private readonly middlewares: Middleware[] = [];

  public constructor(initialMiddlewares: Middleware[] = []) {
    this.middlewares.push(...initialMiddlewares);
  }

  /**
   * 注册中间件
   * @param middleware - 要注册的中间件
   */
  public use(middleware: Middleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * 清空所有中间件
   */
  public clear(): void {
    this.middlewares.length = 0;
  }

  /**
   * 是否存在中间件
   */
  public hasMiddlewares(): boolean {
    return this.middlewares.length > 0;
  }

  /**
   * 执行中间件管道
   * @param context - 请求上下文
   * @param finalHandler - 最终处理函数
   * @returns 响应对象
   */
  public async run(context: Context, finalHandler: NextFunction): Promise<Response> {
    const length = this.middlewares.length;
    if (length === 0) {
      return await finalHandler();
    }

    // 优化：使用索引而不是数组来跟踪调用状态，减少内存分配
    let currentIndex = 0;
    const called = new Array<boolean>(length).fill(false);

    // 创建链式调用函数（从后往前构建）
    const createNext = (index: number): NextFunction => {
      if (index >= length) {
        return finalHandler;
      }

      return async () => {
        if (called[index]) {
          throw new Error('next() called multiple times');
        }
        called[index] = true;
        currentIndex = index + 1;
        const middleware = this.middlewares[index];
        return await middleware(context, createNext(index + 1));
      };
    };

    return await createNext(0)();
  }
}

/**
 * 使用指定的中间件队列执行一次性管道
 * @param middlewares - 中间件数组
 * @param context - 请求上下文
 * @param finalHandler - 最终处理函数
 * @returns 响应对象
 */
export async function runMiddlewares(
  middlewares: Middleware[],
  context: Context,
  finalHandler: NextFunction,
): Promise<Response> {
  if (middlewares.length === 0) {
    return await finalHandler();
  }

  const pipeline = new MiddlewarePipeline(middlewares);
  return await pipeline.run(context, finalHandler);
}


