/**
 * HTTP 异常基类
 */
export class HttpException extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  public constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.details = details;
  }
}

export class BadRequestException extends HttpException {
  public constructor(message: string = 'Bad Request', details?: unknown) {
    super(400, message, details);
  }
}

export class UnauthorizedException extends HttpException {
  public constructor(message: string = 'Unauthorized', details?: unknown) {
    super(401, message, details);
  }
}

export class ForbiddenException extends HttpException {
  public constructor(message: string = 'Forbidden', details?: unknown) {
    super(403, message, details);
  }
}

export class NotFoundException extends HttpException {
  public constructor(message: string = 'Not Found', details?: unknown) {
    super(404, message, details);
  }
}

export class InternalServerErrorException extends HttpException {
  public constructor(message: string = 'Internal Server Error', details?: unknown) {
    super(500, message, details);
  }
}


