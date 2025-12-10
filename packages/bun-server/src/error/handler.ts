import type { Context } from '../core/context';
import { HttpException } from './http-exception';
import { ExceptionFilterRegistry } from './filter';
import { ValidationError } from '../validation';
import { ErrorMessageI18n } from './i18n';

/**
 * 全局错误处理
 */
export async function handleError(error: unknown, context: Context): Promise<Response> {
  const registry = ExceptionFilterRegistry.getInstance();
  const filterResponse = await registry.execute(error, context);
  if (filterResponse) {
    return filterResponse;
  }

  if (error instanceof HttpException) {
    context.setStatus(error.status);

    // 如果异常有错误码，尝试国际化消息
    let errorMessage = error.message;
    if (error.code) {
      const acceptLanguage = context.getHeader('accept-language');
      const language = ErrorMessageI18n.parseLanguageFromHeader(acceptLanguage);
      // 如果提供了消息模板参数，使用参数替换占位符
      errorMessage = ErrorMessageI18n.getMessage(
        error.code,
        language,
        error.messageParams,
      );
    }

    const responseBody: Record<string, unknown> = {
      error: errorMessage,
    };

    // 只有当错误码存在时才添加 code 字段
    if (error.code) {
      responseBody.code = error.code;
    }

    if (error.details !== undefined) {
      responseBody.details = error.details;
    }

    return context.createResponse(responseBody);
  }

  if (error instanceof ValidationError) {
    context.setStatus(400);
    return context.createResponse({
      error: error.message,
      code: 'VALIDATION_FAILED',
      issues: error.issues,
    });
  }

  const message = error instanceof Error ? error.message : String(error);
  context.setStatus(500);
  return context.createResponse({
    error: 'Internal Server Error',
    details: process.env.NODE_ENV === 'production' ? undefined : message,
  });
}


