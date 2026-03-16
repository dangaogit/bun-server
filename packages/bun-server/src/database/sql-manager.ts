import { SQL } from 'bun';

import type { BunSQLConfig } from './types';

export class BunSQLManager {
  private readonly instances = new Map<string, SQL>();
  private defaultTenantId = 'default';

  public getOrCreate(tenantId: string, config: BunSQLConfig): SQL {
    const existing = this.instances.get(tenantId);
    if (existing) {
      return existing;
    }

    const pool = config.pool ?? {};
    const sql = new SQL(config.url, {
      max: pool.max ?? 10,
      idleTimeout: pool.idleTimeout ?? 30,
      maxLifetime: pool.maxLifetime ?? 0,
      connectionTimeout: pool.connectionTimeout ?? 30000,
    });
    this.instances.set(tenantId, sql);
    return sql;
  }

  public hasTenant(tenantId: string): boolean {
    return this.instances.has(tenantId);
  }

  public get(tenantId: string): SQL | undefined {
    return this.instances.get(tenantId);
  }

  public setDefaultTenant(tenantId: string): void {
    this.defaultTenantId = tenantId;
  }

  public getDefault(): SQL {
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
    await sql.close({ timeout });
    this.instances.delete(tenantId);
  }

  public async destroyAll(timeout = 10): Promise<void> {
    const tenantIds = Array.from(this.instances.keys());
    await Promise.all(tenantIds.map((tenantId) => this.destroy(tenantId, timeout)));
  }
}

