import type { Context } from '../core/context';

export interface ExceptionFilter {
  /**
   * 捕获异常并返回 Response
   * 如果返回 undefined，则继续交给下一个过滤器
   */
  catch(error: unknown, context: Context): Response | Promise<Response> | undefined;
}

export class ExceptionFilterRegistry {
  private static instance: ExceptionFilterRegistry;
  private readonly filters: ExceptionFilter[] = [];

  private constructor() {}

  public static getInstance(): ExceptionFilterRegistry {
    if (!ExceptionFilterRegistry.instance) {
      ExceptionFilterRegistry.instance = new ExceptionFilterRegistry();
    }
    return ExceptionFilterRegistry.instance;
  }

  public register(filter: ExceptionFilter): void {
    this.filters.push(filter);
  }

  public clear(): void {
    this.filters.length = 0;
  }

  public async execute(error: unknown, context: Context): Promise<Response | undefined> {
    for (const filter of this.filters) {
      const result = await filter.catch(error, context);
      if (result) {
        return result;
      }
    }
    return undefined;
  }
}


