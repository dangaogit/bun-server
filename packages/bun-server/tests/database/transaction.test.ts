import { describe, expect, test } from 'bun:test';

import { runWithSession } from '../../src/database/database-context';
import { BunSQLManager } from '../../src/database/sql-manager';
import { TransactionManager } from '../../src/database/orm/transaction-manager';

function createReserved() {
  const calls: string[] = [];
  const reserved = (async () => [{ ok: true }]) as any;
  reserved.begin = async <T>(fn: () => Promise<T>) => {
    calls.push('begin');
    const result = await fn();
    calls.push('commit');
    return result;
  };
  reserved.release = async () => {
    calls.push('release');
  };
  return {
    reserved,
    calls,
  };
}

describe('TransactionManager V2', () => {
  test('should run transaction in reserved session', async () => {
    const sqlManager = new BunSQLManager();
    const manager = new TransactionManager(sqlManager as any);
    const { reserved, calls } = createReserved();

    const result = await runWithSession(
      {
        tenantId: 'default',
        reserved,
      },
      async () => await manager.runInTransaction(async () => 'ok'),
    );

    expect(result).toBe('ok');
    expect(calls).toEqual(['begin', 'commit']);
  });

  test('should auto lazy reserve when transaction starts', async () => {
    const sqlManager = new BunSQLManager();
    const manager = new TransactionManager(sqlManager as any);
    const { reserved, calls } = createReserved();

    let reserveCalled = 0;
    await runWithSession(
      {
        tenantId: 'default',
        lazyReserve: async () => {
          reserveCalled += 1;
          return reserved;
        },
      },
      async () => {
        await manager.runInTransaction(async () => undefined);
      },
    );

    expect(reserveCalled).toBe(1);
    expect(calls).toEqual(['begin', 'commit']);
  });

  test('should run nested transaction via savepoint', async () => {
    const sqlManager = new BunSQLManager();
    const manager = new TransactionManager(sqlManager as any);
    const savepointCommands: string[] = [];

    const reserved = (async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => {
      savepointCommands.push(strings.join('?'));
      return [];
    }) as any;
    reserved.begin = async <T>(fn: () => Promise<T>) => await fn();
    reserved.release = async () => undefined;

    await runWithSession(
      {
        tenantId: 'default',
        reserved,
        transaction: {
          id: 'tx-1',
          status: 'ACTIVE' as any,
          level: 0,
          savepoints: [],
        },
      },
      async () => {
        await manager.runInNestedTransaction(async () => undefined);
      },
    );

    expect(savepointCommands.some((item) => item.includes('SAVEPOINT'))).toBe(true);
  });
});
