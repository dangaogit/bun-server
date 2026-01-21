import { describe, expect, test, beforeEach } from 'bun:test';

import { MemorySessionStore, type Session } from '../../src/session/types';

describe('MemorySessionStore', () => {
  let store: MemorySessionStore;

  beforeEach(() => {
    store = new MemorySessionStore();
  });

  function createSession(id: string, data: Record<string, unknown> = {}): Session {
    const now = Date.now();
    return {
      id,
      data,
      createdAt: now,
      lastAccessedAt: now,
      expiresAt: now + 3600000, // 1 hour
    };
  }

  describe('get', () => {
    test('should return undefined for non-existent session', async () => {
      const session = await store.get('non-existent');
      expect(session).toBeUndefined();
    });

    test('should return session if exists and not expired', async () => {
      const session = createSession('test-1', { user: 'alice' });
      await store.set(session, 3600000);

      const retrieved = await store.get('test-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.data.user).toBe('alice');
    });

    test('should return undefined for expired session', async () => {
      const session = createSession('test-2');
      await store.set(session, 50); // 50ms TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const retrieved = await store.get('test-2');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('set', () => {
    test('should set session successfully', async () => {
      const session = createSession('test-3', { count: 42 });
      const result = await store.set(session, 3600000);
      expect(result).toBe(true);

      const retrieved = await store.get('test-3');
      expect(retrieved?.data.count).toBe(42);
    });

    test('should update expiresAt and lastAccessedAt', async () => {
      const session = createSession('test-4');
      const before = Date.now();
      await store.set(session, 60000);

      const retrieved = await store.get('test-4');
      expect(retrieved?.lastAccessedAt).toBeGreaterThanOrEqual(before);
      expect(retrieved?.expiresAt).toBeGreaterThan(Date.now());
    });

    test('should overwrite existing session', async () => {
      const session1 = createSession('test-5', { version: 1 });
      await store.set(session1, 3600000);

      const session2 = createSession('test-5', { version: 2 });
      await store.set(session2, 3600000);

      const retrieved = await store.get('test-5');
      expect(retrieved?.data.version).toBe(2);
    });
  });

  describe('delete', () => {
    test('should delete existing session', async () => {
      const session = createSession('test-6');
      await store.set(session, 3600000);

      const deleted = await store.delete('test-6');
      expect(deleted).toBe(true);

      const retrieved = await store.get('test-6');
      expect(retrieved).toBeUndefined();
    });

    test('should return false for non-existent session', async () => {
      const deleted = await store.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('has', () => {
    test('should return true for existing session', async () => {
      const session = createSession('test-7');
      await store.set(session, 3600000);

      const exists = await store.has('test-7');
      expect(exists).toBe(true);
    });

    test('should return false for non-existent session', async () => {
      const exists = await store.has('non-existent');
      expect(exists).toBe(false);
    });

    test('should return false for expired session', async () => {
      const session = createSession('test-8');
      await store.set(session, 50); // 50ms TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const exists = await store.has('test-8');
      expect(exists).toBe(false);
    });
  });

  describe('touch', () => {
    test('should update lastAccessedAt', async () => {
      const session = createSession('test-9');
      await store.set(session, 3600000);

      const beforeTouch = await store.get('test-9');
      const lastAccessedBefore = beforeTouch?.lastAccessedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));
      await store.touch('test-9');

      const afterTouch = await store.get('test-9');
      expect(afterTouch?.lastAccessedAt).toBeGreaterThanOrEqual(lastAccessedBefore!);
    });

    test('should return false for non-existent session', async () => {
      const result = await store.touch('non-existent');
      expect(result).toBe(false);
    });

    test('should return false for expired session', async () => {
      const session = createSession('test-10');
      await store.set(session, 50); // 50ms TTL

      // Wait for expiration
      await new Promise((resolve) => setTimeout(resolve, 100));

      const result = await store.touch('test-10');
      expect(result).toBe(false);
    });
  });

  describe('clear', () => {
    test('should clear all sessions', async () => {
      await store.set(createSession('s1'), 3600000);
      await store.set(createSession('s2'), 3600000);
      await store.set(createSession('s3'), 3600000);

      const result = await store.clear();
      expect(result).toBe(true);

      expect(await store.has('s1')).toBe(false);
      expect(await store.has('s2')).toBe(false);
      expect(await store.has('s3')).toBe(false);
    });
  });
});
