import { ErrorCode, ERROR_CODE_MESSAGES, ERROR_CODE_TO_STATUS } from './error-codes';
import type { MessageParams } from './i18n';

/**
 * HTTP 异常基类
 */
export class HttpException extends Error {
  public readonly status: number;
  public readonly code?: ErrorCode;
  public readonly details?: unknown;
  public readonly messageParams?: MessageParams;

  public constructor(
    status: number,
    message: string,
    details?: unknown,
    code?: ErrorCode,
    messageParams?: MessageParams,
  ) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.code = code;
    this.details = details;
    this.messageParams = messageParams;
  }

  /**
   * 创建带错误码的异常
   * @param code - 错误码
   * @param message - 自定义错误消息（可选，如果不提供则使用默认消息）
   * @param details - 错误详情（可选）
   * @param messageParams - 消息模板参数（可选，用于替换消息模板中的占位符）
   * @returns HttpException 实例
   *
   * @example
   * ```ts
   * // 基本用法
   * HttpException.withCode(ErrorCode.RESOURCE_NOT_FOUND);
   *
   * // 带自定义消息
   * HttpException.withCode(ErrorCode.RESOURCE_NOT_FOUND, 'User not found');
   *
   * // 带消息模板参数（如果消息模板支持）
   * HttpException.withCode(ErrorCode.RESOURCE_NOT_FOUND, undefined, undefined, { resource: 'User' });
   * ```
   */
  public static withCode(
    code: ErrorCode,
    message?: string,
    details?: unknown,
    messageParams?: MessageParams,
  ): HttpException {
    const status = ERROR_CODE_TO_STATUS[code] || 500;
    const finalMessage = message || ERROR_CODE_MESSAGES[code] || 'Internal Server Error';
    return new HttpException(status, finalMessage, details, code, messageParams);
  }
}

export class BadRequestException extends HttpException {
  public constructor(
    message: string = 'Bad Request',
    details?: unknown,
    code?: ErrorCode,
    messageParams?: MessageParams,
  ) {
    super(400, message, details, code, messageParams);
  }
}

export class UnauthorizedException extends HttpException {
  public constructor(
    message: string = 'Unauthorized',
    details?: unknown,
    code?: ErrorCode,
    messageParams?: MessageParams,
  ) {
    super(401, message, details, code, messageParams);
  }
}

export class ForbiddenException extends HttpException {
  public constructor(
    message: string = 'Forbidden',
    details?: unknown,
    code?: ErrorCode,
    messageParams?: MessageParams,
  ) {
    super(403, message, details, code, messageParams);
  }
}

export class NotFoundException extends HttpException {
  public constructor(
    message: string = 'Not Found',
    details?: unknown,
    code?: ErrorCode,
    messageParams?: MessageParams,
  ) {
    super(404, message, details, code, messageParams);
  }
}

export class InternalServerErrorException extends HttpException {
  public constructor(
    message: string = 'Internal Server Error',
    details?: unknown,
    code?: ErrorCode,
    messageParams?: MessageParams,
  ) {
    super(500, message, details, code, messageParams);
  }
}


