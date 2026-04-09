import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestSuite } from './suite';
import type { PlatformEngine } from '../../../src/platform/types';
import { SqliteManager } from '../../../src/database/sqlite-adapter';

export function runDatabaseCases(suite: TestSuite, engine: PlatformEngine): void {
  const { test, expect } = suite;

  // better-sqlite3 is not supported when running Node-platform tests under Bun runtime
  const skipBetterSqlite = engine === 'node' && typeof (globalThis as any).Bun !== 'undefined';

  test('SqliteAdapter: create table, insert and query', () => {
    if (skipBetterSqlite) {
      // better-sqlite3 is not supported in Bun — this test must run under Node.js
      console.log('[skip] better-sqlite3 not available in Bun runtime; run with vitest for Node platform');
      return;
    }
    const dbPath = join(tmpdir(), `platform-db-test-${engine}-${Date.now()}.db`);
    const manager = new SqliteManager();
    const adapter = manager.getOrCreate('test', { database: dbPath, wal: false });

    adapter.query('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');
    adapter.query("INSERT INTO users (name) VALUES ('Alice')");
    const rows = adapter.query<{ id: number; name: string }>('SELECT * FROM users');

    expect(rows.length).toBeGreaterThanOrEqual(1);
    expect(rows[0]!.name).toBe('Alice');

    manager.destroy('test');
  });

  test('SqliteManager.getDefault() throws when not initialized', () => {
    const manager = new SqliteManager();
    let threw = false;
    try {
      manager.getDefault();
    } catch {
      threw = true;
    }
    expect(threw).toBe(true);
  });
}
