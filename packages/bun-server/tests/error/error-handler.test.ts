import { describe, expect, test } from 'bun:test';

import { Context } from '../../src/core/context';
import { handleError } from '../../src/error/handler';
import { HttpException, BadRequestException } from '../../src/error/http-exception';
import { ValidationError } from '../../src/validation';
import { ExceptionFilterRegistry, type ExceptionFilter } from '../../src/error/filter';

function createContext(url: string = 'http://localhost/api/error'): Context {
  return new Context(new Request(url));
}

describe('Error Handler', () => {
  test('should handle HttpException', async () => {
    const ctx = createContext();
    const error = new BadRequestException('Invalid payload');
    const response = await handleError(error, ctx);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid payload');
  });

  test('should handle ValidationError', async () => {
    const ctx = createContext();
    const validationError = new ValidationError('Validation failed', [
      { index: 0, rule: 'isString', message: 'Must be string' },
    ]);
    const response = await handleError(validationError, ctx);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.issues.length).toBe(1);
  });

  test('should allow custom exception filter', async () => {
    const registry = ExceptionFilterRegistry.getInstance();
    registry.clear();

    const filter: ExceptionFilter = {
      catch(error, context) {
        if (error instanceof Error && error.message === 'custom') {
          context.setStatus(418);
          return context.createResponse({ error: 'filtered' });
        }
        return undefined;
      },
    };

    registry.register(filter);

    const ctx = createContext();
    const response = await handleError(new Error('custom'), ctx);
    expect(response.status).toBe(418);
    const data = await response.json();
    expect(data.error).toBe('filtered');

    registry.clear();
  });

  test('should fallback to 500 for unknown errors', async () => {
    const ctx = createContext();
    const response = await handleError(new Error('unknown'), ctx);
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Internal Server Error');
  });
});


