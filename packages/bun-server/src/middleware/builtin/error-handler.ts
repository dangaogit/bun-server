import type { Middleware } from "../middleware";
import { ValidationError } from "../../validation";
import { LoggerManager } from "@dangao/logsmith";
import { HttpException } from "../../error";
import { handleError } from "../../error/handler";
import { ErrorMessageI18n } from "../../error/i18n";

export interface ErrorHandlerOptions {
  /**
   * 自定义错误日志函数
   */
  logger?: (error: unknown, context: { method: string; path: string }) => void;

  /**
   * 是否返回详细错误信息（默认 false，用于生产环境隐藏细节）
   */
  exposeError?: boolean;

  /**
   * 默认状态码
   */
  statusCode?: number;
}

/**
 * 错误处理中间件：捕获下游异常并统一生成响应
 */
export function createErrorHandlingMiddleware(
  options: ErrorHandlerOptions = {},
): Middleware {
  const log = options.logger ??
    ((error: unknown, context: { method: string; path: string }) => {
      LoggerManager.getLogger().error("[Error]", { ...context, error });
    });
  const expose = options.exposeError ?? false;
  const defaultStatus = options.statusCode ?? 500;

  return async (context, next) => {
    const logger = LoggerManager.getLogger();

    try {
      return await next();
    } catch (error) {
      log(error, { method: context.method, path: context.path });
      logger.error("Unhandled error", {
        method: context.method,
        path: context.path,
        error,
      });

      if (error instanceof Response) {
        return error as Response;
      }

      if (error instanceof ValidationError) {
        return context.createResponse(
          {
            error: error.message,
            issues: error.issues,
          },
          {
            status: 400,
          },
        );
      }

      if (error instanceof HttpException) {
        // 统一使用 handleError 处理，它已经包含了错误码和国际化逻辑
          return await handleError(error, context);
      }

      if (error instanceof Error && !expose) {
        return await handleError(error, context);
      }

      if (error instanceof Error) {
        return context.createResponse(
          {
            error: error.message,
          },
          {
            status: defaultStatus,
          },
        );
      }

      return await handleError(error, context);
    }
  };
}
