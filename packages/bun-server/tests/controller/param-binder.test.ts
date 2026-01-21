import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { ParamBinder } from '../../src/controller/param-binder';
import {
  Body,
  Query,
  Param,
  Header,
  Context as ContextDecorator,
  QueryMap,
  HeaderMap,
} from '../../src/controller/decorators';
import { Context } from '../../src/core/context';
import { Container } from '../../src/di/container';

describe('ParamBinder', () => {
  let container: Container;

  beforeEach(() => {
    container = new Container();
  });

  describe('bind', () => {
    test('should bind @Body parameter', async () => {
      class TestController {
        public testMethod(@Body() body: unknown): void {}
      }

      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' }),
      });
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params[0]).toEqual({ name: 'test' });
    });

    test('should bind @Body with key parameter', async () => {
      class TestController {
        public testMethod(@Body('name') name: string): void {}
      }

      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'alice', age: 25 }),
      });
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params[0]).toBe('alice');
    });

    test('should bind @Query parameter', async () => {
      class TestController {
        public testMethod(@Query('id') id: string): void {}
      }

      const request = new Request('http://localhost/test?id=123');
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params[0]).toBe('123');
    });

    test('should bind @Param parameter', async () => {
      class TestController {
        public testMethod(@Param('id') id: string): void {}
      }

      const request = new Request('http://localhost/users/456');
      const context = new Context(request, container);
      context.params = { id: '456' };

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params[0]).toBe('456');
    });

    test('should bind @Header parameter', async () => {
      class TestController {
        public testMethod(@Header('x-custom') custom: string): void {}
      }

      const request = new Request('http://localhost/test', {
        headers: { 'X-Custom': 'custom-value' },
      });
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params[0]).toBe('custom-value');
    });

    test('should bind @Context parameter', async () => {
      class TestController {
        public testMethod(@ContextDecorator() ctx: Context): void {}
      }

      const request = new Request('http://localhost/test');
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      // 返回的是 context 或 AsyncLocalStorage 中的 context
      expect(params[0]).toBeDefined();
    });

    test('should bind multiple parameters in correct order', async () => {
      class TestController {
        public testMethod(
          @Query('name') name: string,
          @Query('age') age: string,
          @Header('x-token') token: string,
        ): void {}
      }

      const request = new Request('http://localhost/test?name=alice&age=25', {
        headers: { 'X-Token': 'abc123' },
      });
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params[0]).toBe('alice');
      expect(params[1]).toBe('25');
      expect(params[2]).toBe('abc123');
    });

    test('should return empty array for method without decorators', async () => {
      class TestController {
        public testMethod(arg: string): void {}
      }

      const request = new Request('http://localhost/test');
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params).toEqual([]);
    });

    test('should handle @QueryMap parameter', async () => {
      class TestController {
        public testMethod(@QueryMap() query: Record<string, string>): void {}
      }

      const request = new Request('http://localhost/test?foo=bar&baz=qux');
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params[0]).toEqual({ foo: 'bar', baz: 'qux' });
    });

    test('should handle @QueryMap with transform', async () => {
      class TestController {
        public testMethod(
          @QueryMap({
            transform: (map) => ({ ...map, transformed: true }),
          })
          query: Record<string, unknown>,
        ): void {}
      }

      const request = new Request('http://localhost/test?foo=bar');
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect((params[0] as any).transformed).toBe(true);
    });

    test('should handle @HeaderMap parameter', async () => {
      class TestController {
        public testMethod(@HeaderMap() headers: Record<string, string>): void {}
      }

      const request = new Request('http://localhost/test', {
        headers: { 'X-Custom': 'value1', 'X-Another': 'value2' },
      });
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect((params[0] as any)['x-custom']).toBe('value1');
      expect((params[0] as any)['x-another']).toBe('value2');
    });

    test('should handle @HeaderMap with pick', async () => {
      class TestController {
        public testMethod(
          @HeaderMap({ pick: ['x-custom'] })
          headers: Record<string, string>,
        ): void {}
      }

      const request = new Request('http://localhost/test', {
        headers: { 'X-Custom': 'value1', 'X-Another': 'value2' },
      });
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect((params[0] as any)['x-custom']).toBe('value1');
      expect((params[0] as any)['x-another']).toBeUndefined();
    });

    test('should handle missing body key', async () => {
      class TestController {
        public testMethod(@Body('missing') value: string): void {}
      }

      const request = new Request('http://localhost/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'test' }),
      });
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params[0]).toBeUndefined();
    });

    test('should return null for missing query param', async () => {
      class TestController {
        public testMethod(@Query('missing') value: string): void {}
      }

      const request = new Request('http://localhost/test');
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params[0]).toBeNull();
    });

    test('should return undefined for missing path param', async () => {
      class TestController {
        public testMethod(@Param('missing') value: string): void {}
      }

      const request = new Request('http://localhost/test');
      const context = new Context(request, container);

      const params = await ParamBinder.bind(
        TestController.prototype,
        'testMethod',
        context,
        container,
      );

      expect(params[0]).toBeUndefined();
    });
  });
});
