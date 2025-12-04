import type { Context } from '../core/context';
import { HttpException } from './http-exception';
import { ExceptionFilterRegistry } from './filter';
import { ValidationError } from '../validation';

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
    return context.createResponse({
      error: error.message,
      details: error.details,
    });
  }

  if (error instanceof ValidationError) {
    context.setStatus(400);
    return context.createResponse({
      error: error.message,
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


