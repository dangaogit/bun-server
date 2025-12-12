import { describe, expect, test } from 'bun:test';
import { InterceptorChain } from '../../src/interceptor/interceptor-chain';
import type { Interceptor } from '../../src/interceptor';
import type { Container } from '../../src/di/container';

describe('InterceptorChain Argument Modification', () => {
  const mockContainer = {} as Container;

  test('should allow interceptors to modify arguments', async () => {
    // Test interceptor that modifies arguments: multiply first argument by 2
    const modifyArgsInterceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        const modifiedArgs = [(args[0] as number) * 2, ...args.slice(1)];
        return await Promise.resolve(originalMethod.apply(target, modifiedArgs));
      },
    };

    // Test method that returns the first argument
    function testMethod(x: number): number {
      return x;
    }

    const interceptors: Interceptor[] = [modifyArgsInterceptor];
    const result = await InterceptorChain.execute(
      interceptors,
      {},
      'testMethod',
      testMethod,
      [5], // Original argument: 5
      mockContainer,
    );

    // Should return 10 (5 * 2) because interceptor modified the argument
    expect(result).toBe(10);
  });

  test('should allow multiple interceptors to modify arguments sequentially', async () => {
    // First interceptor: multiply by 2
    const multiplyInterceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        const modifiedArgs = [(args[0] as number) * 2, ...args.slice(1)];
        return await Promise.resolve(originalMethod.apply(target, modifiedArgs));
      },
    };

    // Second interceptor: add 3
    const addInterceptor: Interceptor = {
      async execute(target, propertyKey, originalMethod, args, container, context) {
        const modifiedArgs = [(args[0] as number) + 3, ...args.slice(1)];
        return await Promise.resolve(originalMethod.apply(target, modifiedArgs));
      },
    };

    // Test method that returns the first argument
    function testMethod(x: number): number {
      return x;
    }

    const interceptors: Interceptor[] = [multiplyInterceptor, addInterceptor];
    const result = await InterceptorChain.execute(
      interceptors,
      {},
      'testMethod',
      testMethod,
      [5], // Original argument: 5
      mockContainer,
    );

    // Should return 13: (5 * 2) + 3 = 13
    // Note: The order depends on how interceptors pass modified args
    // In our implementation, each interceptor receives currentArgs and can modify them
    // The last interceptor's modification takes effect
    expect(result).toBe(13);
  });
});

