import { describe, expect, test } from 'bun:test';

import {
  HttpException,
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
  ForbiddenException,
  InternalServerErrorException,
} from '../../src/error/http-exception';

describe('HttpException', () => {
  test('should preserve status and message', () => {
    const error = new HttpException(418, 'I am a teapot', { foo: 'bar' });
    expect(error.status).toBe(418);
    expect(error.message).toBe('I am a teapot');
    expect(error.details).toEqual({ foo: 'bar' });
  });

  test('should provide convenient subclasses', () => {
    const badRequest = new BadRequestException('Invalid body');
    const notFound = new NotFoundException();
    const unauthorized = new UnauthorizedException();
    const forbidden = new ForbiddenException('Stop');
    const internal = new InternalServerErrorException(undefined, { traceId: 'abc' });

    expect(badRequest.status).toBe(400);
    expect(badRequest.message).toBe('Invalid body');
    expect(notFound.status).toBe(404);
    expect(notFound.message).toBe('Not Found');
    expect(unauthorized.status).toBe(401);
    expect(forbidden.message).toBe('Stop');
    expect(internal.details).toEqual({ traceId: 'abc' });
  });
});


