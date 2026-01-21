import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  UseMiddleware,
  RateLimit,
  getClassMiddlewares,
  getMethodMiddlewares,
} from '../../src/middleware/decorators';
import type { Middleware } from '../../src/middleware';
import type { Context } from '../../src/core/context';

// 模拟中间件
const mockMiddleware1: Middleware = async (ctx, next) => {
  return await next();
};

const mockMiddleware2: Middleware = async (ctx, next) => {
  return await next();
};

const mockMiddleware3: Middleware = async (ctx, next) => {
  return await next();
};

describe('UseMiddleware Decorator', () => {
  describe('Class-level middleware', () => {
    test('should register single middleware on class', () => {
      @UseMiddleware(mockMiddleware1)
      class TestController {}

      const middlewares = getClassMiddlewares(TestController);
      expect(middlewares.length).toBe(1);
      expect(middlewares[0]).toBe(mockMiddleware1);
    });

    test('should register multiple middlewares on class', () => {
      @UseMiddleware(mockMiddleware1, mockMiddleware2, mockMiddleware3)
      class TestController {}

      const middlewares = getClassMiddlewares(TestController);
      expect(middlewares.length).toBe(3);
      expect(middlewares).toContain(mockMiddleware1);
      expect(middlewares).toContain(mockMiddleware2);
      expect(middlewares).toContain(mockMiddleware3);
    });

    test('should accumulate middlewares from multiple decorators', () => {
      @UseMiddleware(mockMiddleware1)
      @UseMiddleware(mockMiddleware2)
      class TestController {}

      const middlewares = getClassMiddlewares(TestController);
      expect(middlewares.length).toBe(2);
    });

    test('should return empty array for class without middleware', () => {
      class TestController {}

      const middlewares = getClassMiddlewares(TestController);
      expect(middlewares).toEqual([]);
    });

    test('should not register when empty array passed', () => {
      @UseMiddleware()
      class TestController {}

      const middlewares = getClassMiddlewares(TestController);
      expect(middlewares.length).toBe(0);
    });
  });

  describe('Method-level middleware', () => {
    test('should register single middleware on method', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        public testMethod(): void {}
      }

      const middlewares = getMethodMiddlewares(
        TestController.prototype,
        'testMethod',
      );
      expect(middlewares.length).toBe(1);
      expect(middlewares[0]).toBe(mockMiddleware1);
    });

    test('should register multiple middlewares on method', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1, mockMiddleware2)
        public testMethod(): void {}
      }

      const middlewares = getMethodMiddlewares(
        TestController.prototype,
        'testMethod',
      );
      expect(middlewares.length).toBe(2);
    });

    test('should accumulate middlewares from multiple decorators on method', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        @UseMiddleware(mockMiddleware2)
        public testMethod(): void {}
      }

      const middlewares = getMethodMiddlewares(
        TestController.prototype,
        'testMethod',
      );
      expect(middlewares.length).toBe(2);
    });

    test('should return empty array for method without middleware', () => {
      class TestController {
        public testMethod(): void {}
      }

      const middlewares = getMethodMiddlewares(
        TestController.prototype,
        'testMethod',
      );
      expect(middlewares).toEqual([]);
    });

    test('should keep separate middlewares for different methods', () => {
      class TestController {
        @UseMiddleware(mockMiddleware1)
        public method1(): void {}

        @UseMiddleware(mockMiddleware2)
        public method2(): void {}
      }

      const middlewares1 = getMethodMiddlewares(
        TestController.prototype,
        'method1',
      );
      const middlewares2 = getMethodMiddlewares(
        TestController.prototype,
        'method2',
      );

      expect(middlewares1.length).toBe(1);
      expect(middlewares1[0]).toBe(mockMiddleware1);
      expect(middlewares2.length).toBe(1);
      expect(middlewares2[0]).toBe(mockMiddleware2);
    });
  });

  describe('Mixed class and method middleware', () => {
    test('should keep class and method middlewares separate', () => {
      @UseMiddleware(mockMiddleware1)
      class TestController {
        @UseMiddleware(mockMiddleware2)
        public testMethod(): void {}
      }

      const classMiddlewares = getClassMiddlewares(TestController);
      const methodMiddlewares = getMethodMiddlewares(
        TestController.prototype,
        'testMethod',
      );

      expect(classMiddlewares.length).toBe(1);
      expect(classMiddlewares[0]).toBe(mockMiddleware1);
      expect(methodMiddlewares.length).toBe(1);
      expect(methodMiddlewares[0]).toBe(mockMiddleware2);
    });
  });
});

describe('RateLimit Decorator', () => {
  test('should create rate limit middleware on method', () => {
    class TestController {
      @RateLimit({ limit: 100, windowMs: 60000 })
      public testMethod(): void {}
    }

    const middlewares = getMethodMiddlewares(
      TestController.prototype,
      'testMethod',
    );

    expect(middlewares.length).toBe(1);
    expect(typeof middlewares[0]).toBe('function');
  });

  test('should create rate limit middleware with custom options', () => {
    class TestController {
      @RateLimit({
        limit: 10,
        windowMs: 1000,
        keyGenerator: (ctx: Context) => ctx.request.url,
      })
      public limitedMethod(): void {}
    }

    const middlewares = getMethodMiddlewares(
      TestController.prototype,
      'limitedMethod',
    );

    expect(middlewares.length).toBe(1);
  });

  test('should work alongside UseMiddleware', () => {
    class TestController {
      @UseMiddleware(mockMiddleware1)
      @RateLimit({ limit: 50, windowMs: 30000 })
      public testMethod(): void {}
    }

    const middlewares = getMethodMiddlewares(
      TestController.prototype,
      'testMethod',
    );

    expect(middlewares.length).toBe(2);
  });
});
