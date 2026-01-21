import { describe, expect, test, beforeEach, afterEach } from 'bun:test';

import { MemoryCacheStore } from '../../src/cache/types';

describe('MemoryCacheStore', () => {
  let store: MemoryCacheStore;

  beforeEach(() => {
    store = new MemoryCacheStore();
  });

  describe('get and set', () => {
    test('should return undefined for non-existent key', async () => {
      const value = await store.get('non-existent');
      expect(value).toBeUndefined();
    });

    test('should set and get a value', async () => {
      await store.set('key1', 'value1');
      const value = await store.get('key1');
      expect(value).toBe('value1');
    });

    test('should set and get an object', async () => {
      const obj = { name: 'test', count: 42 };
      await store.set('key2', obj);
      const value = await store.get<typeof obj>('key2');
      expect(value).toEqual(obj);
    });

    test('should return undefined for expired key', async () => {
      await store.set('key3', 'value3', 50); // 50ms TTL
      
      // 立即获取应该有值
      const value1 = await store.get('key3');
      expect(value1).toBe('value3');
      
      // 等待过期
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const value2 = await store.get('key3');
      expect(value2).toBeUndefined();
    });

    test('should overwrite existing value', async () => {
      await store.set('key4', 'first');
      await store.set('key4', 'second');
      const value = await store.get('key4');
      expect(value).toBe('second');
    });
  });

  describe('delete', () => {
    test('should delete existing key', async () => {
      await store.set('key5', 'value5');
      const deleted = await store.delete('key5');
      expect(deleted).toBe(true);
      const value = await store.get('key5');
      expect(value).toBeUndefined();
    });

    test('should return false for non-existent key', async () => {
      const deleted = await store.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('has', () => {
    test('should return true for existing key', async () => {
      await store.set('key6', 'value6');
      const exists = await store.has('key6');
      expect(exists).toBe(true);
    });

    test('should return false for non-existent key', async () => {
      const exists = await store.has('non-existent');
      expect(exists).toBe(false);
    });

    test('should return false for expired key', async () => {
      await store.set('key7', 'value7', 50);
      await new Promise((resolve) => setTimeout(resolve, 100));
      const exists = await store.has('key7');
      expect(exists).toBe(false);
    });
  });

  describe('clear', () => {
    test('should clear all entries', async () => {
      await store.set('key8', 'value8');
      await store.set('key9', 'value9');
      await store.clear();
      expect(await store.has('key8')).toBe(false);
      expect(await store.has('key9')).toBe(false);
    });
  });

  describe('getMany', () => {
    test('should get multiple values', async () => {
      await store.set('a', 1);
      await store.set('b', 2);
      await store.set('c', 3);
      
      const result = await store.getMany<number>(['a', 'b', 'c', 'd']);
      expect(result.get('a')).toBe(1);
      expect(result.get('b')).toBe(2);
      expect(result.get('c')).toBe(3);
      expect(result.has('d')).toBe(false);
    });
  });

  describe('setMany', () => {
    test('should set multiple values', async () => {
      const entries = [
        { key: 'x', value: 'X' },
        { key: 'y', value: 'Y' },
        { key: 'z', value: 'Z' },
      ];
      await store.setMany(entries);
      
      expect(await store.get('x')).toBe('X');
      expect(await store.get('y')).toBe('Y');
      expect(await store.get('z')).toBe('Z');
    });

    test('should set multiple values with TTL', async () => {
      const entries = [
        { key: 'p', value: 'P' },
        { key: 'q', value: 'Q' },
      ];
      await store.setMany(entries, 50);
      
      expect(await store.get('p')).toBe('P');
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(await store.get('p')).toBeUndefined();
    });
  });

  describe('deleteMany', () => {
    test('should delete multiple keys', async () => {
      await store.set('m', 1);
      await store.set('n', 2);
      await store.set('o', 3);
      
      const deleted = await store.deleteMany(['m', 'n', 'missing']);
      expect(deleted).toContain('m');
      expect(deleted).toContain('n');
      expect(deleted).not.toContain('missing');
      
      expect(await store.has('m')).toBe(false);
      expect(await store.has('n')).toBe(false);
      expect(await store.has('o')).toBe(true);
    });
  });
});
