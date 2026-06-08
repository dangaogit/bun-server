import { describe, expect, test, mock, beforeAll } from 'bun:test';

import { initRuntime, getRuntime } from '../../src/platform/runtime';

/**
 * 验证：在 Bun 运行时下显式选用 driver: 'mysql2' 时，
 * 连接创建 / 参数化查询 / health check / close 全部走 mysql2（而非 Bun.SQL）。
 *
 * 通过 mock 'mysql2/promise' 模块注入假连接，无需真实 MySQL。
 */

const createdConnections: Array<Record<string, unknown>> = [];
const queryCalls: Array<{ sql: string; params: unknown[] }> = [];
let endCount = 0;

function makeFakeConnection() {
  const conn = {
    query: async (sql: string, params: unknown[]) => {
      queryCalls.push({ sql, params });
      // mysql2 返回 [rows, fields]
      if (/select\s+1/i.test(sql)) {
        return [[{ '1': 1 }], []];
      }
      return [[{ id: 1, name: 'alice' }], [{ name: 'id' }, { name: 'name' }]];
    },
    end: async () => {
      endCount += 1;
    },
    close: async () => {
      throw new Error('mysql2 connection should be closed via end(), not close()');
    },
  };
  createdConnections.push(conn);
  return conn;
}

mock.module('mysql2/promise', () => {
  const createConnection = async (_opts: unknown) => makeFakeConnection();
  const createPool = (_opts: unknown) => makeFakeConnection();
  return {
    default: { createConnection, createPool },
    createConnection,
    createPool,
  };
});

describe('DatabaseService with driver: mysql2 on Bun runtime', () => {
  beforeAll(() => {
    initRuntime('bun');
  });

  test('runs the full lifecycle (create/query/health/close) through mysql2', async () => {
    // 前置确认：当前进程运行在 Bun，但我们强制 mysql2
    expect(getRuntime().engine).toBe('bun');

    const { DatabaseService } = await import('../../src/database/service');

    const svc = new DatabaseService({
      database: {
        type: 'mysql',
        driver: 'mysql2',
        config: {
          host: 'localhost',
          port: 3306,
          database: 'testdb',
          user: 'root',
          password: 'secret',
        },
      },
      enableHealthCheck: true,
    });

    await svc.initialize();

    // 连接由 mysql2.createConnection 创建
    expect(createdConnections.length).toBeGreaterThan(0);

    // 参数化查询走 mysql2.query(sql, params)，并返回 rows（而非 [rows, fields]）
    const rows = await svc.query<{ id: number; name: string }>(
      'SELECT * FROM users WHERE id = ?',
      [1],
    );
    expect(rows).toEqual([{ id: 1, name: 'alice' }]);
    expect(queryCalls.some((c) => c.sql === 'SELECT * FROM users WHERE id = ?' && c.params[0] === 1)).toBe(true);

    // health check 走 mysql2.query('SELECT 1')
    const healthy = await svc.healthCheck();
    expect(healthy).toBe(true);
    expect(queryCalls.some((c) => /select\s+1/i.test(c.sql))).toBe(true);

    // close 走 mysql2 的 end()
    await svc.closePool();
    expect(endCount).toBeGreaterThan(0);
  });
});
