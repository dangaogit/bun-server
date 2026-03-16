import { describe, expect, test } from 'bun:test';

import { db, initDbProxy } from '../../src/database/db-proxy';
import { runWithSession } from '../../src/database/database-context';

describe('db proxy', () => {
  test('should fallback to default sql when no session', async () => {
    const calls: unknown[] = [];
    const defaultSql = async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => {
      calls.push([strings.join('?'), ...values]);
      return [{ ok: true }];
    };
    initDbProxy(
      {
        getDefault: () => defaultSql,
      } as any,
      {
        runInTransaction: async <T>(fn: () => Promise<T>) => await fn(),
      } as any,
    );

    const result = await db`SELECT ${1}`;
    expect(result).toEqual([{ ok: true }]);
    expect(calls.length).toBe(1);
  });

  test('should route to reserved connection in session', async () => {
    const reservedCalls: unknown[] = [];
    const reserved = (async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => {
      reservedCalls.push([strings.join('?'), ...values]);
      return [{ via: 'reserved' }];
    }) as any;

    initDbProxy(
      {
        getDefault: () => async () => [{ via: 'default' }],
      } as any,
      {
        runInTransaction: async <T>(fn: () => Promise<T>) => await fn(),
      } as any,
    );

    const result = await runWithSession(
      {
        tenantId: 'default',
        reserved,
      },
      async () => await db`SELECT ${2}`,
    );

    expect(result).toEqual([{ via: 'reserved' }]);
    expect(reservedCalls.length).toBe(1);
  });

  test('should use lazyReserve only once', async () => {
    let reservedCount = 0;
    const reserved = (async () => [{ via: 'lazy' }]) as any;
    reserved.begin = async <T>(fn: () => Promise<T>) => await fn();
    reserved.release = async () => undefined;

    initDbProxy(
      {
        getDefault: () => async () => [{ via: 'default' }],
      } as any,
      {
        runInTransaction: async <T>(fn: () => Promise<T>) => await fn(),
      } as any,
    );

    await runWithSession(
      {
        tenantId: 'default',
        lazyReserve: async () => {
          reservedCount += 1;
          return reserved;
        },
      },
      async () => {
        await db`SELECT 1`;
        await db`SELECT 2`;
      },
    );

    expect(reservedCount).toBe(2);
  });
});

