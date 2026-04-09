import type { BunSQLConfig } from './types';
import { getRuntime } from '../platform/runtime';

/**
 * SQL 连接管理器
 * 在 Bun 平台下使用 Bun.SQL，在 Node.js 平台下使用 postgres/mysql2
 * 内部自动感知运行时，用户无需关心底层实现
 */
export class BunSQLManager {
  private readonly instances = new Map<string, unknown>();
  private defaultTenantId = 'default';

  public getOrCreate(tenantId: string, config: BunSQLConfig): unknown {
    const existing = this.instances.get(tenantId);
    if (existing) {
      return existing;
    }

    const pool = config.pool ?? {};
    let sql: unknown;

    if (getRuntime().engine === 'bun') {
      const { SQL } = require('bun') as typeof import('bun');
      sql = new SQL(config.url, {
        max: pool.max ?? 10,
        idleTimeout: pool.idleTimeout ?? 30,
        maxLifetime: pool.maxLifetime ?? 0,
        connectionTimeout: pool.connectionTimeout ?? 30000,
      });
    } else {
      // Node.js: detect dialect from URL
      const url = config.url.toLowerCase();
      if (url.startsWith('mysql://') || url.startsWith('mysql2://')) {
        const mysql2 = require('mysql2/promise') as typeof import('mysql2/promise');
        // Create a pool in Node.js
        sql = mysql2.createPool({
          uri: config.url,
          connectionLimit: pool.max ?? 10,
          waitForConnections: true,
        });
      } else {
        // postgres (default)
        const postgres = require('postgres') as typeof import('postgres');
        sql = postgres(config.url, {
          max: pool.max ?? 10,
          idle_timeout: pool.idleTimeout ?? 30,
          max_lifetime: pool.maxLifetime ?? 0,
          connect_timeout: (pool.connectionTimeout ?? 30000) / 1000,
        });
      }
    }

    this.instances.set(tenantId, sql);
    return sql;
  }

  public hasTenant(tenantId: string): boolean {
    return this.instances.has(tenantId);
  }

  public get(tenantId: string): unknown {
    return this.instances.get(tenantId);
  }

  public setDefaultTenant(tenantId: string): void {
    this.defaultTenantId = tenantId;
  }

  public getDefault(): unknown {
    const sql = this.instances.get(this.defaultTenantId);
    if (!sql) {
      throw new Error(
        `[BunSQLManager] default tenant '${this.defaultTenantId}' not initialized`,
      );
    }
    return sql;
  }

  public async destroy(tenantId: string, timeout = 10): Promise<void> {
    const sql = this.instances.get(tenantId);
    if (!sql) {
      return;
    }
    if (typeof (sql as any).close === 'function') {
      await (sql as any).close({ timeout });
    } else if (typeof (sql as any).end === 'function') {
      await (sql as any).end();
    }
    this.instances.delete(tenantId);
  }

  public async destroyAll(timeout = 10): Promise<void> {
    const tenantIds = Array.from(this.instances.keys());
    await Promise.all(tenantIds.map((tenantId) => this.destroy(tenantId, timeout)));
  }
}

