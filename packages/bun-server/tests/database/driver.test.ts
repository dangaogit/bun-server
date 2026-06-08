import { describe, expect, test } from 'bun:test';

import {
  closeViaDriver,
  getConnectionDriver,
  healthCheckViaDriver,
  queryViaDriver,
  resolveDriver,
  tagConnection,
  templateQueryViaDriver,
} from '../../src/database/driver';

describe('resolveDriver', () => {
  test("'auto' on bun resolves to bun-sql for mysql and postgres", () => {
    expect(resolveDriver('mysql', 'auto', 'bun')).toBe('bun-sql');
    expect(resolveDriver('postgres', 'auto', 'bun')).toBe('bun-sql');
    expect(resolveDriver('mysql', undefined, 'bun')).toBe('bun-sql');
  });

  test("'auto' on node resolves to js drivers", () => {
    expect(resolveDriver('mysql', 'auto', 'node')).toBe('mysql2');
    expect(resolveDriver('postgres', 'auto', 'node')).toBe('postgres');
  });

  test("'mysql2' forces mysql2 regardless of engine", () => {
    expect(resolveDriver('mysql', 'mysql2', 'bun')).toBe('mysql2');
    expect(resolveDriver('mysql', 'mysql2', 'node')).toBe('mysql2');
  });

  test("'postgres' forces postgres regardless of engine", () => {
    expect(resolveDriver('postgres', 'postgres', 'bun')).toBe('postgres');
    expect(resolveDriver('postgres', 'postgres', 'node')).toBe('postgres');
  });

  test("'bun-sql' is valid on bun, throws on node", () => {
    expect(resolveDriver('mysql', 'bun-sql', 'bun')).toBe('bun-sql');
    expect(() => resolveDriver('mysql', 'bun-sql', 'node')).toThrow();
  });

  test("'mysql2' on postgres type throws", () => {
    expect(() => resolveDriver('postgres', 'mysql2', 'bun')).toThrow();
  });

  test("'postgres' on mysql type throws", () => {
    expect(() => resolveDriver('mysql', 'postgres', 'bun')).toThrow();
  });
});

describe('connection tagging', () => {
  test('tag and read back driver on object connection', () => {
    const conn = { query: () => undefined };
    tagConnection(conn, 'mysql2');
    expect(getConnectionDriver(conn)).toBe('mysql2');
  });

  test('tag preserves identity', () => {
    const conn = {};
    expect(tagConnection(conn, 'mysql2')).toBe(conn);
  });

  test('tag is non-enumerable', () => {
    const conn = { query: () => undefined };
    tagConnection(conn, 'mysql2');
    expect(Object.keys(conn)).toEqual(['query']);
  });

  test('callable connection without tag falls back to bun-sql', () => {
    const conn = (() => undefined) as unknown;
    expect(getConnectionDriver(conn)).toBe('bun-sql');
  });

  test('untagged plain object returns undefined', () => {
    expect(getConnectionDriver({ query: () => undefined })).toBeUndefined();
  });
});

describe('queryViaDriver', () => {
  test('mysql2 connection uses .query and returns rows (not [rows, fields])', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const conn = tagConnection(
      {
        query: async (sql: string, params: unknown[]) => {
          calls.push({ sql, params });
          return [[{ id: 1 }], [{ name: 'id' }]];
        },
      },
      'mysql2',
    );

    const rows = await queryViaDriver(conn, 'SELECT * FROM t WHERE id = ?', [1]);
    expect(rows).toEqual([{ id: 1 }]);
    expect(calls).toEqual([{ sql: 'SELECT * FROM t WHERE id = ?', params: [1] }]);
  });

  test('postgres connection uses .unsafe and returns rows', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const conn = tagConnection(
      {
        unsafe: async (sql: string, params: unknown[]) => {
          calls.push({ sql, params });
          return [{ ok: true }];
        },
      },
      'postgres',
    );

    const rows = await queryViaDriver(conn, 'SELECT 1 WHERE x = ?', ['y']);
    expect(rows).toEqual([{ ok: true }]);
    expect(calls).toEqual([{ sql: 'SELECT 1 WHERE x = ?', params: ['y'] }]);
  });

  test('bun-sql connection uses template string path', async () => {
    let received: { strings: string[]; values: unknown[] } | null = null;
    const conn = tagConnection(
      Object.assign(
        async (strings: TemplateStringsArray, ...values: unknown[]) => {
          received = { strings: Array.from(strings), values };
          return [{ via: 'bun-sql' }];
        },
      ),
      'bun-sql',
    );

    const rows = await queryViaDriver(conn, 'SELECT * FROM t WHERE id = ?', [42]);
    expect(rows).toEqual([{ via: 'bun-sql' }]);
    expect(received!.strings).toEqual(['SELECT * FROM t WHERE id = ', '']);
    expect(received!.values).toEqual([42]);
  });
});

describe('templateQueryViaDriver', () => {
  test('mysql2 transforms template into ? placeholders', async () => {
    const calls: Array<{ sql: string; params: unknown[] }> = [];
    const conn = tagConnection(
      {
        query: async (sql: string, params: unknown[]) => {
          calls.push({ sql, params });
          return [[{ id: 7 }], []];
        },
      },
      'mysql2',
    );

    const strings = Object.assign(['SELECT * FROM t WHERE id = ', ''], {
      raw: ['SELECT * FROM t WHERE id = ', ''],
    }) as unknown as TemplateStringsArray;

    const rows = await templateQueryViaDriver(conn, strings, [7]);
    expect(rows).toEqual([{ id: 7 }]);
    expect(calls).toEqual([
      { sql: 'SELECT * FROM t WHERE id = ?', params: [7] },
    ]);
  });

  test('callable connection invoked directly as tagged template', async () => {
    let received: unknown[] = [];
    const conn = tagConnection(
      Object.assign(
        async (_strings: TemplateStringsArray, ...values: unknown[]) => {
          received = values;
          return [{ ok: 1 }];
        },
      ),
      'bun-sql',
    );

    const strings = Object.assign(['SELECT ', ''], {
      raw: ['SELECT ', ''],
    }) as unknown as TemplateStringsArray;

    const rows = await templateQueryViaDriver(conn, strings, [99]);
    expect(rows).toEqual([{ ok: 1 }]);
    expect(received).toEqual([99]);
  });
});

describe('healthCheckViaDriver', () => {
  test('mysql2 health check runs SELECT 1', async () => {
    const conn = tagConnection(
      {
        query: async () => [[{ '1': 1 }], []],
      },
      'mysql2',
    );
    expect(await healthCheckViaDriver(conn)).toBe(true);
  });

  test('returns false when query throws', async () => {
    const conn = tagConnection(
      {
        query: async () => {
          throw new Error('down');
        },
      },
      'mysql2',
    );
    expect(await healthCheckViaDriver(conn)).toBe(false);
  });
});

describe('closeViaDriver', () => {
  test('mysql2 connection closed via .end()', async () => {
    let ended = false;
    let closed = false;
    const conn = tagConnection(
      {
        end: async () => {
          ended = true;
        },
        close: async () => {
          closed = true;
        },
      },
      'mysql2',
    );
    await closeViaDriver(conn);
    expect(ended).toBe(true);
    expect(closed).toBe(false);
  });

  test('bun-sql connection closed via .close()', async () => {
    let closed = false;
    const conn = tagConnection(
      {
        close: async () => {
          closed = true;
        },
      },
      'bun-sql',
    );
    await closeViaDriver(conn);
    expect(closed).toBe(true);
  });
});
