import { beforeAll, describe, expect, test } from 'bun:test';

import { Semaphore, SqliteAdapter } from '../../src/database/sqlite-adapter';
import { initRuntime } from '../../src/platform/runtime';

beforeAll(() => {
  initRuntime();
});

describe('SqliteAdapter', () => {
  test('should execute query and write', async () => {
    const adapter = new SqliteAdapter({
      type: 'sqlite',
      database: ':memory:',
      wal: true,
    });

    await adapter.execute(
      'CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)',
    );
    await adapter.execute('INSERT INTO users (name) VALUES (?)', ['alice']);

    const rows = await adapter.query<{ id: number; name: string }>(
      'SELECT * FROM users',
    );
    expect(rows.length).toBe(1);
    expect(rows[0]?.name).toBe('alice');

    adapter.close();
  });
});

describe('Semaphore', () => {
  test('should acquire and release lock', async () => {
    const semaphore = new Semaphore(1);
    const lock1 = await semaphore.acquire();

    let acquiredSecond = false;
    const pending = semaphore.acquire().then((lock2) => {
      acquiredSecond = true;
      lock2[Symbol.dispose]();
    });

    expect(acquiredSecond).toBe(false);
    lock1[Symbol.dispose]();
    await pending;
    expect(acquiredSecond).toBe(true);
  });
});

