import { Database, type SQLQueryBindings } from 'bun:sqlite';

import type { SqliteV2Config } from './types';

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

export class SqliteAdapter {
  private readonly db: Database;
  public readonly semaphore: Semaphore;

  public constructor(config: SqliteV2Config) {
    this.db = new Database(config.database);
    if (config.wal !== false) {
      this.db.exec('PRAGMA journal_mode = WAL;');
    }
    this.semaphore = new Semaphore(config.maxWriteConcurrency ?? 1);
  }

  public query<T = unknown>(sql: string, params: SQLQueryBindings[] = []): T[] {
    const stmt = this.db.query(sql);
    return stmt.all(...params) as T[];
  }

  public async execute(sql: string, params: SQLQueryBindings[] = []): Promise<void> {
    const stmt = this.db.query(sql);
    stmt.run(...params);
  }

  public close(): void {
    this.db.close();
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

