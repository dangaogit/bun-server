import type { SqliteV2Config } from './types';
import { getRuntime } from '../platform/runtime';

export interface DisposableLock {
  [Symbol.dispose](): void;
}

export class Semaphore {
  private active = 0;
  private readonly queue: Array<() => void> = [];

  public constructor(private readonly max: number) {}

  public async acquire(): Promise<DisposableLock> {
    if (this.active < this.max) {
      this.active += 1;
      return this.createDisposable();
    }

    await new Promise<void>((resolve) => this.queue.push(resolve));
    this.active += 1;
    return this.createDisposable();
  }

  private createDisposable(): DisposableLock {
    let released = false;
    return {
      [Symbol.dispose]: () => {
        if (released) {
          return;
        }
        released = true;
        this.active = Math.max(0, this.active - 1);
        const next = this.queue.shift();
        next?.();
      },
    };
  }
}

/**
 * SQLite 适配器（自动感知运行时）
 * Bun 平台下使用 bun:sqlite，Node.js 平台下使用 @vscode/sqlite3
 */
export class SqliteAdapter {
  private readonly db: unknown;
  public readonly semaphore: Semaphore;
  private readonly isBun: boolean;

  public constructor(config: SqliteV2Config) {
    this.isBun = getRuntime().engine === 'bun';

    if (this.isBun) {
      const { Database } = require('bun:sqlite') as typeof import('bun:sqlite');
      const db = new Database(config.database);
      if (config.wal !== false) {
        db.exec('PRAGMA journal_mode = WAL;');
      }
      this.db = db;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sqlite3 = require('@vscode/sqlite3') as any;
      const db: any = new sqlite3.Database(config.database);
      if (config.wal !== false) {
        // Operations are serialized internally; WAL is queued before any query runs
        db.run('PRAGMA journal_mode = WAL;');
      }
      this.db = db;
    }

    this.semaphore = new Semaphore(config.maxWriteConcurrency ?? 1);
  }

  public async query<T = unknown>(sql: string, params: unknown[] = []): Promise<T[]> {
    if (this.isBun) {
      const db = this.db as import('bun:sqlite').Database;
      const stmt = db.query(sql);
      return stmt.all(...params as Parameters<typeof stmt.all>) as T[];
    }
    return new Promise<T[]>((resolve, reject) => {
      (this.db as any).all(sql, params, (err: Error | null, rows: T[]) => {
        if (err) reject(err);
        else resolve(rows ?? []);
      });
    });
  }

  public async execute(sql: string, params: unknown[] = []): Promise<void> {
    if (this.isBun) {
      const db = this.db as import('bun:sqlite').Database;
      const stmt = db.query(sql);
      stmt.run(...params as Parameters<typeof stmt.run>);
    } else {
      return new Promise<void>((resolve, reject) => {
        (this.db as any).run(sql, params, (err: Error | null) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  }

  public close(): void {
    if (typeof (this.db as any).close === 'function') {
      (this.db as any).close();
    }
  }
}

export class SqliteManager {
  private readonly instances = new Map<string, SqliteAdapter>();
  private defaultTenantId = 'default';

  public getOrCreate(tenantId: string, config: SqliteV2Config): SqliteAdapter {
    const existing = this.instances.get(tenantId);
    if (existing) {
      return existing;
    }
    const adapter = new SqliteAdapter(config);
    this.instances.set(tenantId, adapter);
    return adapter;
  }

  public setDefaultTenant(tenantId: string): void {
    this.defaultTenantId = tenantId;
  }

  public getDefault(): SqliteAdapter {
    const adapter = this.instances.get(this.defaultTenantId);
    if (!adapter) {
      throw new Error(
        `[SqliteManager] default tenant '${this.defaultTenantId}' not initialized`,
      );
    }
    return adapter;
  }

  public getAdapter(tenantId: string): SqliteAdapter {
    const adapter = this.instances.get(tenantId);
    if (!adapter) {
      throw new Error(`[SqliteManager] tenant '${tenantId}' not initialized`);
    }
    return adapter;
  }

  public destroy(tenantId: string): void {
    const adapter = this.instances.get(tenantId);
    if (!adapter) {
      return;
    }
    adapter.close();
    this.instances.delete(tenantId);
  }

  public destroyAll(): void {
    for (const [tenantId, adapter] of this.instances.entries()) {
      adapter.close();
      this.instances.delete(tenantId);
    }
  }
}

