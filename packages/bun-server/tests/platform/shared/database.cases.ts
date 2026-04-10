import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestSuite } from './suite';
import type { PlatformEngine } from '../../../src/platform/types';
import { SqliteManager } from '../../../src/database/sqlite-adapter';

export function runDatabaseCases(suite: TestSuite, engine: PlatformEngine): void {
  const { test, expect } = suite;

  // @vscode/sqlite3 is a native Node.js addon; skip when Node-platform tests run under Bun runtime
  const skipNodeSqlite = engine === 'node' && typeof (globalThis as any).Bun !== 'undefined';

  test('SqliteAdapter: create table, insert and query', async () => {
    if (skipNodeSqlite) {
      // @vscode/sqlite3 is not available in Bun — this test must run under Node.js
      console.log('[skip] @vscode/sqlite3 not available in Bun runtime; run with vitest for Node platform');
      return;
    }
    const dbPath = join(tmpdir(), `platform-db-test-${engine}-${Date.now()}.db`);
    const manager = new SqliteManager();
    const adapter = manager.getOrCreate('test', { database: dbPath, wal: false });

    await adapter.query('CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT)');
    await adapter.query("INSERT INTO users (name) VALUES ('Alice')");
    const rows = await adapter.query<{ id: number; name: string }>('SELECT * FROM users');

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
