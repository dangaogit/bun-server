import 'reflect-metadata';
import { describe, expect, test } from 'bun:test';
import { applyDecorators } from '../../src/core/apply-decorators';

const TEST_KEY_A = Symbol('test:a');
const TEST_KEY_B = Symbol('test:b');
const TEST_KEY_C = Symbol('test:c');

function MarkA(value: string): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(TEST_KEY_A, value, target, propertyKey);
  };
}

function MarkB(value: number): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(TEST_KEY_B, value, target, propertyKey);
  };
}

function ClassMark(value: string): ClassDecorator {
  return (target) => {
    Reflect.defineMetadata(TEST_KEY_C, value, target);
  };
}

describe('applyDecorators', () => {
  test('should compose method decorators', () => {
    const Combined = applyDecorators(MarkA('hello'), MarkB(42));

    class TestClass {
      @Combined
      public myMethod(): void {}
    }

    const a = Reflect.getMetadata(TEST_KEY_A, TestClass.prototype, 'myMethod');
    const b = Reflect.getMetadata(TEST_KEY_B, TestClass.prototype, 'myMethod');
    expect(a).toBe('hello');
    expect(b).toBe(42);
  });

  test('should compose class decorators', () => {
    const Combined = applyDecorators(
      ClassMark('cls-value'),
    );

    @Combined
    class TestClass {}

    const c = Reflect.getMetadata(TEST_KEY_C, TestClass);
    expect(c).toBe('cls-value');
  });

  test('should apply decorators in correct order (last applied first)', () => {
    const order: string[] = [];

    function Track(label: string): MethodDecorator {
      return (target, propertyKey) => {
        order.push(label);
      };
    }

    const Combined = applyDecorators(Track('first'), Track('second'));

    class TestClass {
      @Combined
      public myMethod(): void {}
    }

    // decorators.reverse() means 'second' is applied first, then 'first'
    expect(order).toEqual(['second', 'first']);
  });

  test('should work with single decorator', () => {
    const Combined = applyDecorators(MarkA('solo'));

    class TestClass {
      @Combined
      public myMethod(): void {}
    }

    const a = Reflect.getMetadata(TEST_KEY_A, TestClass.prototype, 'myMethod');
    expect(a).toBe('solo');
  });

  test('should work with many decorators', () => {
    const keys: symbol[] = [];
    const decorators: MethodDecorator[] = [];
    for (let i = 0; i < 10; i++) {
      const key = Symbol(`test:${i}`);
      keys.push(key);
      decorators.push((target, propertyKey) => {
        Reflect.defineMetadata(key, i, target, propertyKey);
      });
    }

    const Combined = applyDecorators(...decorators);

    class TestClass {
      @Combined
      public myMethod(): void {}
    }

    for (let i = 0; i < 10; i++) {
      const val = Reflect.getMetadata(keys[i]!, TestClass.prototype, 'myMethod');
      expect(val).toBe(i);
    }
  });
});
