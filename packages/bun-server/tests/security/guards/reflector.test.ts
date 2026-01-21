import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { Reflector, REFLECTOR_TOKEN } from '../../../src/security/guards/reflector';

const TEST_KEY = Symbol('test:metadata');
const ROLES_KEY = Symbol('roles');

describe('Reflector', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('get', () => {
    test('should get metadata from class', () => {
      @Reflect.metadata(TEST_KEY, 'class-value')
      class TestClass {}

      const value = reflector.get<string>(TEST_KEY, TestClass);
      expect(value).toBe('class-value');
    });

    test('should return undefined if no metadata', () => {
      class TestClass {}

      const value = reflector.get<string>(TEST_KEY, TestClass);
      expect(value).toBeUndefined();
    });
  });

  describe('getFromClass', () => {
    test('should get metadata from class', () => {
      @Reflect.metadata(ROLES_KEY, ['admin', 'user'])
      class TestClass {}

      const roles = reflector.getFromClass<string[]>(ROLES_KEY, TestClass);
      expect(roles).toEqual(['admin', 'user']);
    });

    test('should return undefined for non-decorated class', () => {
      class PlainClass {}

      const value = reflector.getFromClass<string[]>(ROLES_KEY, PlainClass);
      expect(value).toBeUndefined();
    });
  });

  describe('getFromMethod', () => {
    test('should get metadata from method', () => {
      class TestClass {
        @Reflect.metadata(ROLES_KEY, ['moderator'])
        public testMethod(): void {}
      }

      const roles = reflector.getFromMethod<string[]>(
        ROLES_KEY,
        TestClass.prototype,
        'testMethod',
      );
      expect(roles).toEqual(['moderator']);
    });

    test('should return undefined for non-decorated method', () => {
      class TestClass {
        public plainMethod(): void {}
      }

      const value = reflector.getFromMethod<string[]>(
        ROLES_KEY,
        TestClass.prototype,
        'plainMethod',
      );
      expect(value).toBeUndefined();
    });
  });

  describe('getAllAndMerge', () => {
    test('should merge class and method metadata', () => {
      @Reflect.metadata(ROLES_KEY, ['admin'])
      class TestClass {
        @Reflect.metadata(ROLES_KEY, ['user'])
        public testMethod(): void {}
      }

      const roles = reflector.getAllAndMerge<string[]>(
        ROLES_KEY,
        TestClass,
        'testMethod',
      );
      expect(roles).toContain('admin');
      expect(roles).toContain('user');
      expect(roles.length).toBe(2);
    });

    test('should return class metadata if method has none', () => {
      @Reflect.metadata(ROLES_KEY, ['admin'])
      class TestClass {
        public plainMethod(): void {}
      }

      const roles = reflector.getAllAndMerge<string[]>(
        ROLES_KEY,
        TestClass,
        'plainMethod',
      );
      expect(roles).toEqual(['admin']);
    });

    test('should return method metadata if class has none', () => {
      class TestClass {
        @Reflect.metadata(ROLES_KEY, ['user'])
        public testMethod(): void {}
      }

      const roles = reflector.getAllAndMerge<string[]>(
        ROLES_KEY,
        TestClass,
        'testMethod',
      );
      expect(roles).toEqual(['user']);
    });

    test('should return empty array if neither has metadata', () => {
      class TestClass {
        public plainMethod(): void {}
      }

      const roles = reflector.getAllAndMerge<string[]>(
        ROLES_KEY,
        TestClass,
        'plainMethod',
      );
      expect(roles).toEqual([]);
    });
  });

  describe('getAllAndOverride', () => {
    test('should return method metadata when both exist', () => {
      @Reflect.metadata(ROLES_KEY, 'class-value')
      class TestClass {
        @Reflect.metadata(ROLES_KEY, 'method-value')
        public testMethod(): void {}
      }

      const value = reflector.getAllAndOverride<string>(
        ROLES_KEY,
        TestClass,
        'testMethod',
      );
      expect(value).toBe('method-value');
    });

    test('should return class metadata if method has none', () => {
      @Reflect.metadata(ROLES_KEY, 'class-value')
      class TestClass {
        public plainMethod(): void {}
      }

      const value = reflector.getAllAndOverride<string>(
        ROLES_KEY,
        TestClass,
        'plainMethod',
      );
      expect(value).toBe('class-value');
    });

    test('should return undefined if neither has metadata', () => {
      class TestClass {
        public plainMethod(): void {}
      }

      const value = reflector.getAllAndOverride<string>(
        ROLES_KEY,
        TestClass,
        'plainMethod',
      );
      expect(value).toBeUndefined();
    });
  });

  describe('REFLECTOR_TOKEN', () => {
    test('should be a symbol', () => {
      expect(typeof REFLECTOR_TOKEN).toBe('symbol');
    });
  });
});
