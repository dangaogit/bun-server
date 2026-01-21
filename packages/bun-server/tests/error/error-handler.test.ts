import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { handleError } from '../../src/error/handler';
import { HttpException, BadRequestException, UnauthorizedException, ForbiddenException, NotFoundException } from '../../src/error';
import { ValidationError } from '../../src/validation';
import { Context } from '../../src/core/context';
import { Container } from '../../src/di/container';

describe('handleError', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  function createContext(): Context {
    const request = new Request('http://localhost/test');
    return new Context(request, container);
  }

  describe('HttpException handling', () => {
    test('should handle basic HttpException', async () => {
      const context = createContext();
      const error = new HttpException(400, 'Bad request');

      const response = await handleError(error, context);
      const body = await response.json() as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toBe('Bad request');
    });

    test('should handle BadRequestException', async () => {
      const context = createContext();
      const error = new BadRequestException('Invalid input');

      const response = await handleError(error, context);
      const body = await response.json() as { error: string };

      expect(response.status).toBe(400);
      expect(body.error).toBe('Invalid input');
    });

    test('should handle UnauthorizedException', async () => {
      const context = createContext();
      const error = new UnauthorizedException('Not authenticated');

      const response = await handleError(error, context);
      const body = await response.json() as { error: string };

      expect(response.status).toBe(401);
      expect(body.error).toBe('Not authenticated');
    });

    test('should handle ForbiddenException', async () => {
      const context = createContext();
      const error = new ForbiddenException('Access denied');

      const response = await handleError(error, context);
      const body = await response.json() as { error: string };

      expect(response.status).toBe(403);
      expect(body.error).toBe('Access denied');
    });

    test('should handle NotFoundException', async () => {
      const context = createContext();
      const error = new NotFoundException('Resource not found');

      const response = await handleError(error, context);
      const body = await response.json() as { error: string };

      expect(response.status).toBe(404);
      expect(body.error).toBe('Resource not found');
    });

    test('should include error code in response when present', async () => {
      const context = createContext();
      // HttpException 构造函数: (status, message, details?, code?, messageParams?)
      const error = new HttpException(400, 'Validation failed', undefined, 'E001');

      const response = await handleError(error, context);
      const body = await response.json() as { error: string; code: string };

      expect(body.code).toBe('E001');
    });

    test('should include details in response when present', async () => {
      const context = createContext();
      const error = new HttpException(400, 'Validation failed');
      (error as any).details = { field: 'email', issue: 'invalid format' };

      const response = await handleError(error, context);
      const body = await response.json() as { error: string; details: unknown };

      expect(body.details).toEqual({ field: 'email', issue: 'invalid format' });
    });
  });

  describe('ValidationError handling', () => {
    test('should handle ValidationError', async () => {
      const context = createContext();
      const error = new ValidationError('Validation failed', [
        { path: 'email', message: 'Invalid email format' },
      ]);

      const response = await handleError(error, context);
      const body = await response.json() as { error: string; code: string; issues: unknown[] };

      expect(response.status).toBe(400);
      expect(body.error).toBe('Validation failed');
      expect(body.code).toBe('VALIDATION_FAILED');
      expect(body.issues).toHaveLength(1);
    });

    test('should include all validation issues', async () => {
      const context = createContext();
      const error = new ValidationError('Multiple errors', [
        { path: 'email', message: 'Invalid email' },
        { path: 'name', message: 'Name is required' },
        { path: 'age', message: 'Age must be positive' },
      ]);

      const response = await handleError(error, context);
      const body = await response.json() as { issues: unknown[] };

      expect(body.issues).toHaveLength(3);
    });
  });

  describe('Unknown error handling', () => {
    test('should handle Error instance', async () => {
      const context = createContext();
      const error = new Error('Something went wrong');

      const response = await handleError(error, context);
      const body = await response.json() as { error: string; details?: string };

      expect(response.status).toBe(500);
      expect(body.error).toBe('Internal Server Error');
    });

    test('should handle string error', async () => {
      const context = createContext();
      const error = 'String error message';

      const response = await handleError(error, context);
      const body = await response.json() as { error: string };

      expect(response.status).toBe(500);
      expect(body.error).toBe('Internal Server Error');
    });

    test('should handle null error', async () => {
      const context = createContext();
      const error = null;

      const response = await handleError(error, context);
      const body = await response.json() as { error: string };

      expect(response.status).toBe(500);
      expect(body.error).toBe('Internal Server Error');
    });

    test('should handle undefined error', async () => {
      const context = createContext();
      const error = undefined;

      const response = await handleError(error, context);
      const body = await response.json() as { error: string };

      expect(response.status).toBe(500);
      expect(body.error).toBe('Internal Server Error');
    });
  });
});
