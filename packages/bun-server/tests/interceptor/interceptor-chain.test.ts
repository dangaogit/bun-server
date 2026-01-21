import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { InterceptorChain } from '../../src/interceptor/interceptor-chain';
import type { Interceptor } from '../../src/interceptor/types';
import { Container } from '../../src/di/container';
import { Context } from '../../src/core/context';

describe('InterceptorChain', () => {
  let container: Container;
  let context: Context;

  beforeEach(() => {
    container = new Container();
    const request = new Request('http://localhost/test');
    context = new Context(request, container);
  });

  describe('execute', () => {
    test('should execute original method when no interceptors', async () => {
      let methodCalled = false;
      const originalMethod = () => {
        methodCalled = true;
        return 'result';
      };

      const result = await InterceptorChain.execute(
        [],
        {},
        'testMethod',
        originalMethod,
        [],
        container,
        context,
      );

      expect(methodCalled).toBe(true);
      expect(result).toBe('result');
    });

    test('should execute single interceptor', async () => {
      const calls: string[] = [];

      const interceptor: Interceptor = {
        priority: 0,
        execute: async (target, propertyKey, next, args, container, context) => {
          calls.push('before');
          const result = await next();
          calls.push('after');
          return result;
        },
      };

      const result = await InterceptorChain.execute(
        [interceptor],
        {},
        'testMethod',
        () => {
          calls.push('method');
          return 'result';
        },
        [],
        container,
        context,
      );

      expect(calls).toEqual(['before', 'method', 'after']);
      expect(result).toBe('result');
    });

    test('should execute interceptors in order', async () => {
      const calls: number[] = [];

      const interceptor1: Interceptor = {
        priority: 1,
        execute: async (target, propertyKey, next) => {
          calls.push(1);
          const result = await next();
          calls.push(-1);
          return result;
        },
      };

      const interceptor2: Interceptor = {
        priority: 2,
        execute: async (target, propertyKey, next) => {
          calls.push(2);
          const result = await next();
          calls.push(-2);
          return result;
        },
      };

      await InterceptorChain.execute(
        [interceptor1, interceptor2],
        {},
        'testMethod',
        () => {
          calls.push(0);
          return 'result';
        },
        [],
        container,
        context,
      );

      expect(calls).toEqual([1, 2, 0, -2, -1]);
    });

    test('should allow interceptor to modify return value', async () => {
      const interceptor: Interceptor = {
        priority: 0,
        execute: async (target, propertyKey, next) => {
          const result = await next();
          return `modified-${result}`;
        },
      };

      const result = await InterceptorChain.execute(
        [interceptor],
        {},
        'testMethod',
        () => 'original',
        [],
        container,
        context,
      );

      expect(result).toBe('modified-original');
    });

    test('should pass arguments to interceptors', async () => {
      let receivedArgs: unknown[] = [];

      const interceptor: Interceptor = {
        priority: 0,
        execute: async (target, propertyKey, next, args) => {
          receivedArgs = args;
          return await next();
        },
      };

      await InterceptorChain.execute(
        [interceptor],
        {},
        'testMethod',
        (a: number, b: string) => `${a}-${b}`,
        [42, 'hello'],
        container,
        context,
      );

      expect(receivedArgs).toEqual([42, 'hello']);
    });

    test('should handle async original method', async () => {
      const interceptor: Interceptor = {
        priority: 0,
        execute: async (target, propertyKey, next) => {
          return await next();
        },
      };

      const result = await InterceptorChain.execute(
        [interceptor],
        {},
        'testMethod',
        async () => {
          await new Promise((r) => setTimeout(r, 10));
          return 'async-result';
        },
        [],
        container,
        context,
      );

      expect(result).toBe('async-result');
    });

    test('should propagate errors from original method', async () => {
      const interceptor: Interceptor = {
        priority: 0,
        execute: async (target, propertyKey, next) => {
          return await next();
        },
      };

      await expect(
        InterceptorChain.execute(
          [interceptor],
          {},
          'testMethod',
          () => {
            throw new Error('Method error');
          },
          [],
          container,
          context,
        ),
      ).rejects.toThrow('Method error');
    });

    test('should propagate errors from interceptor', async () => {
      const interceptor: Interceptor = {
        priority: 0,
        execute: async () => {
          throw new Error('Interceptor error');
        },
      };

      await expect(
        InterceptorChain.execute(
          [interceptor],
          {},
          'testMethod',
          () => 'result',
          [],
          container,
          context,
        ),
      ).rejects.toThrow('Interceptor error');
    });

    test('should allow interceptor to modify arguments', async () => {
      let finalArgs: unknown[] = [];

      const interceptor: Interceptor = {
        priority: 0,
        execute: async (target, propertyKey, next, args) => {
          // Modify arguments by calling next with new args
          return await next(...['modified', 42]);
        },
      };

      const result = await InterceptorChain.execute(
        [interceptor],
        {},
        'testMethod',
        (...args: unknown[]) => {
          finalArgs = args;
          return 'done';
        },
        ['original', 0],
        container,
        context,
      );

      expect(finalArgs).toEqual(['modified', 42]);
    });
  });
});
