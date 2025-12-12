import 'reflect-metadata';
import { describe, expect, test } from 'bun:test';
import { InterceptorChain } from '../../src/interceptor';
import type { Interceptor } from '../../src/interceptor';
import { Container } from '../../src/di/container';
import { Context } from '../../src/core/context';

describe('InterceptorChain', () => {
  test('should execute method directly when no interceptors', async () => {
    const container = new Container();
    const target = {};
    const propertyKey = 'testMethod';
    const originalMethod = () => 'result';

    const result = await InterceptorChain.execute(
      [],
      target,
      propertyKey,
      originalMethod,
      [],
      container,
    );

    expect(result).toBe('result');
  });

  test('should execute single interceptor', async () => {
    const container = new Container();
    const target = {};
    const propertyKey = 'testMethod';
    const originalMethod = () => 'result';
    let executed = false;

    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        executed = true;
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    const result = await InterceptorChain.execute(
      [interceptor],
      target,
      propertyKey,
      originalMethod,
      [],
      container,
    );

    expect(executed).toBe(true);
    expect(result).toBe('result');
  });

  test('should execute multiple interceptors in order', async () => {
    const container = new Container();
    const target = {};
    const propertyKey = 'testMethod';
    const originalMethod = () => 'result';
    const executionOrder: string[] = [];

    const interceptor1: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        executionOrder.push('interceptor1-before');
        const result = await Promise.resolve(originalMethod.apply(target, args));
        executionOrder.push('interceptor1-after');
        return result;
      },
    };

    const interceptor2: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        executionOrder.push('interceptor2-before');
        const result = await Promise.resolve(originalMethod.apply(target, args));
        executionOrder.push('interceptor2-after');
        return result;
      },
    };

    const result = await InterceptorChain.execute(
      [interceptor1, interceptor2],
      target,
      propertyKey,
      originalMethod,
      [],
      container,
    );

    expect(result).toBe('result');
    // 执行顺序：interceptor1 -> interceptor2 -> method -> interceptor2 -> interceptor1
    expect(executionOrder).toEqual([
      'interceptor1-before',
      'interceptor2-before',
      'interceptor2-after',
      'interceptor1-after',
    ]);
  });

  test('should handle async method', async () => {
    const container = new Container();
    const target = {};
    const propertyKey = 'testMethod';
    const originalMethod = async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return 'async-result';
    };

    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    const result = await InterceptorChain.execute(
      [interceptor],
      target,
      propertyKey,
      originalMethod,
      [],
      container,
    );

    expect(result).toBe('async-result');
  });

  test('should propagate errors', async () => {
    const container = new Container();
    const target = {};
    const propertyKey = 'testMethod';
    const originalMethod = () => {
      throw new Error('test error');
    };

    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    await expect(
      InterceptorChain.execute([interceptor], target, propertyKey, originalMethod, [], container),
    ).rejects.toThrow('test error');
  });

  test('should pass context to interceptors', async () => {
    const container = new Container();
    const target = {};
    const propertyKey = 'testMethod';
    const originalMethod = () => 'result';
    const context = new Context(new Request('http://localhost/test'));
    let receivedContext: Context | undefined;

    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, ctx) {
        receivedContext = ctx;
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    await InterceptorChain.execute(
      [interceptor],
      target,
      propertyKey,
      originalMethod,
      [],
      container,
      context,
    );

    expect(receivedContext).toBe(context);
  });

  test('should pass args to interceptors', async () => {
    const container = new Container();
    const target = {};
    const propertyKey = 'testMethod';
    const originalMethod = (a: string, b: number) => `${a}-${b}`;
    let receivedArgs: unknown[] = [];

    const interceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        receivedArgs = args;
        return await Promise.resolve(originalMethod.apply(target, args));
      },
    };

    const result = await InterceptorChain.execute(
      [interceptor],
      target,
      propertyKey,
      originalMethod,
      ['test', 123],
      container,
    );

    expect(receivedArgs).toEqual(['test', 123]);
    expect(result).toBe('test-123');
  });
});

