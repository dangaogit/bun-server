import { describe, expect, test, beforeEach } from 'bun:test';

import { RedisCacheStore, type RedisCacheStoreOptions } from '../../src/cache/types';

// Mock Redis client
function createMockRedisClient() {
  const store = new Map<string, { value: string; expiresAt?: number }>();

  return {
    get: async (key: string): Promise<string | null> => {
      const entry = store.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    set: async (key: string, value: string, options?: { PX?: number }): Promise<void> => {
      const expiresAt = options?.PX ? Date.now() + options.PX : undefined;
      store.set(key, { value, expiresAt });
    },
    del: async (key: string): Promise<void> => {
      store.delete(key);
    },
    exists: async (key: string): Promise<number> => {
      return store.has(key) ? 1 : 0;
    },
    mget: async (keys: string[]): Promise<(string | null)[]> => {
      return keys.map((key) => {
        const entry = store.get(key);
        return entry ? entry.value : null;
      });
    },
    mset: async (entries: Array<{ key: string; value: string }>): Promise<void> => {
      for (const { key, value } of entries) {
        store.set(key, { value });
      }
    },
    flushdb: async (): Promise<void> => {
      store.clear();
    },
    _store: store, // For testing
  };
}

describe('RedisCacheStore', () => {
  let store: RedisCacheStore;
  let mockClient: ReturnType<typeof createMockRedisClient>;

  beforeEach(() => {
    mockClient = createMockRedisClient();
    store = new RedisCacheStore({ client: mockClient });
  });

  describe('get', () => {
    test('should return undefined for non-existent key', async () => {
      const value = await store.get('non-existent');
      expect(value).toBeUndefined();
    });

    test('should get and parse JSON value', async () => {
      await mockClient.set('cache:test', JSON.stringify({ name: 'alice' }));
      const value = await store.get<{ name: string }>('test');
      expect(value).toEqual({ name: 'alice' });
    });

    test('should return undefined for invalid JSON', async () => {
      await mockClient.set('cache:invalid', 'not-json');
      const value = await store.get('invalid');
      expect(value).toBeUndefined();
    });
  });

  describe('set', () => {
    test('should set value', async () => {
      const result = await store.set('key1', { count: 42 });
      expect(result).toBe(true);

      const stored = await mockClient.get('cache:key1');
      expect(stored).toBe(JSON.stringify({ count: 42 }));
    });

    test('should set value with TTL', async () => {
      await store.set('key2', 'value', 1000);

      const stored = await mockClient.get('cache:key2');
      expect(stored).toBe('"value"');
    });
  });

  describe('delete', () => {
    test('should delete key', async () => {
      await store.set('key3', 'value');
      const result = await store.delete('key3');
      expect(result).toBe(true);

      const value = await store.get('key3');
      expect(value).toBeUndefined();
    });
  });

  describe('has', () => {
    test('should return true for existing key', async () => {
      await store.set('key4', 'value');
      const exists = await store.has('key4');
      expect(exists).toBe(true);
    });

    test('should return false for non-existent key', async () => {
      const exists = await store.has('non-existent');
      expect(exists).toBe(false);
    });
  });

  describe('clear', () => {
    test('should clear all keys', async () => {
      await store.set('a', 1);
      await store.set('b', 2);
      const result = await store.clear();
      expect(result).toBe(true);
    });
  });

  describe('getMany', () => {
    test('should get multiple values', async () => {
      await store.set('m1', 'v1');
      await store.set('m2', 'v2');

      const result = await store.getMany<string>(['m1', 'm2', 'm3']);
      expect(result.get('m1')).toBe('v1');
      expect(result.get('m2')).toBe('v2');
      expect(result.has('m3')).toBe(false);
    });

    test('should return empty map for empty keys', async () => {
      const result = await store.getMany([]);
      expect(result.size).toBe(0);
    });
  });

  describe('setMany', () => {
    test('should set multiple values', async () => {
      const entries = [
        { key: 's1', value: 'v1' },
        { key: 's2', value: 'v2' },
      ];
      const result = await store.setMany(entries);
      expect(result).toBe(true);

      expect(await store.get('s1')).toBe('v1');
      expect(await store.get('s2')).toBe('v2');
    });

    test('should return true for empty entries', async () => {
      const result = await store.setMany([]);
      expect(result).toBe(true);
    });

    test('should set multiple values with TTL', async () => {
      const entries = [
        { key: 't1', value: 'v1' },
        { key: 't2', value: 'v2' },
      ];
      const result = await store.setMany(entries, 5000);
      expect(result).toBe(true);
    });
  });

  describe('deleteMany', () => {
    test('should delete multiple keys', async () => {
      await store.set('d1', 'v1');
      await store.set('d2', 'v2');

      const deleted = await store.deleteMany(['d1', 'd2', 'd3']);
      expect(deleted).toContain('d1');
      expect(deleted).toContain('d2');
    });

    test('should return empty array for empty keys', async () => {
      const deleted = await store.deleteMany([]);
      expect(deleted).toEqual([]);
    });
  });

  describe('keyPrefix', () => {
    test('should use custom key prefix', async () => {
      const customStore = new RedisCacheStore({
        client: mockClient,
        keyPrefix: 'custom:',
      });

      await customStore.set('test', 'value');

      const stored = await mockClient.get('custom:test');
      expect(stored).toBe('"value"');
    });
  });
});
