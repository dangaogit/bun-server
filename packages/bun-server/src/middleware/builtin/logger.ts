import type { Middleware } from "../middleware";
import { LoggerManager } from "logsmith";

export interface LoggerMiddlewareOptions {
  /**
   * 自定义日志函数
   */
  logger?: (message: string, details?: Record<string, unknown>) => void;

  /**
   * 日志前缀
   */
  prefix?: string;
}

/**
 * 简单日志中间件：记录请求方法与路径
 */
export function createLoggerMiddleware(
  options: LoggerMiddlewareOptions = {},
): Middleware {
  const log = options.logger ??
    ((message: string, details?: Record<string, unknown>) => {
      const logger = LoggerManager.getLogger();
      if (details) {
        logger.info(message, details);
      } else {
        logger.info(message);
      }
    });
  const prefix = options.prefix ?? "[Logger]";

  return async (context, next) => {
    let response: Response | undefined;
    try {
      response = await next();
      return response;
    } finally {
      const status = response?.status ?? context.statusCode ?? 200;
      log(`${prefix} ${context.method} ${context.path} ${status}`);
    }
  };
}

export interface RequestLoggingOptions extends LoggerMiddlewareOptions {
  /**
   * 是否在响应头中附加请求耗时
   */
  setHeader?: boolean;
}

/**
 * 请求日志中间件：记录耗时与状态码
 */
export function createRequestLoggingMiddleware(
  options: RequestLoggingOptions = {},
): Middleware {
  const log = options.logger ??
    ((message: string, details?: Record<string, unknown>) => {
      const logger = LoggerManager.getLogger();
      logger.info(message, details);
    });
  const prefix = options.prefix ?? "[Request]";
  const setHeader = options.setHeader ?? true;

  return async (context, next) => {
    const start = performance.now();
    try {
      const response = await next();
      const duration = performance.now() - start;
      log(
        `${prefix} ${context.method} ${context.path} ${response.status} ${
          duration.toFixed(2)
        }ms`,
      );
      if (setHeader) {
        context.setHeader("x-request-duration", duration.toFixed(2));
      }
      return response;
    } catch (error) {
      const duration = performance.now() - start;
      log(
        `${prefix} ${context.method} ${context.path} error ${
          duration.toFixed(2)
        }ms`,
        error instanceof Error ? { error: error.message } : undefined,
      );
      throw error;
    }
  };
}
