import { describe, expect, test } from 'bun:test';
import { ConfigModule } from '../../src/config/config-module';

describe('ConfigModule.setValueByPath', () => {
  test('should set value at root level', () => {
    const obj: Record<string, unknown> = {};
    // 使用反射访问私有方法进行测试
    const setValueByPath = (ConfigModule as any).setValueByPath.bind(ConfigModule);
    setValueByPath(obj, 'key', 'value');
    expect(obj.key).toBe('value');
  });

  test('should set value at nested level', () => {
    const obj: Record<string, unknown> = {};
    const setValueByPath = (ConfigModule as any).setValueByPath.bind(ConfigModule);
    setValueByPath(obj, 'a.b.c', 'value');
    expect((obj.a as any).b.c).toBe('value');
  });

  test('should handle null values correctly', () => {
    const obj: Record<string, unknown> = {
      a: null,
    };
    const setValueByPath = (ConfigModule as any).setValueByPath.bind(ConfigModule);
    // 当 a 是 null 时，应该创建新对象而不是尝试使用 null
    setValueByPath(obj, 'a.b', 'value');
    expect((obj.a as any).b).toBe('value');
    expect(typeof obj.a).toBe('object');
    expect(obj.a).not.toBeNull();
  });

  test('should handle existing nested objects', () => {
    const obj: Record<string, unknown> = {
      a: {
        b: 'existing',
      },
    };
    const setValueByPath = (ConfigModule as any).setValueByPath.bind(ConfigModule);
    setValueByPath(obj, 'a.c', 'new');
    expect((obj.a as any).b).toBe('existing');
    expect((obj.a as any).c).toBe('new');
  });

  test('should overwrite non-object values', () => {
    const obj: Record<string, unknown> = {
      a: 'string-value',
    };
    const setValueByPath = (ConfigModule as any).setValueByPath.bind(ConfigModule);
    setValueByPath(obj, 'a.b', 'value');
    expect((obj.a as any).b).toBe('value');
  });
});

