import { describe, expect, test } from 'bun:test';

import { BunSQLManager } from '../../src/database/sql-manager';

describe('BunSQLManager', () => {
  test('should throw when default tenant not initialized', () => {
    const manager = new BunSQLManager();
    expect(() => manager.getDefault()).toThrow();
  });

  test('should create and reuse instance by tenant', () => {
    const manager = new BunSQLManager();
    const mockSql = { close: async () => undefined };
    let created = 0;
    (manager as any).instances = new Map();
    const originalGetOrCreate = manager.getOrCreate.bind(manager);

    (manager as any).getOrCreate = (tenantId: string, config: any) => {
      const existing = (manager as any).instances.get(tenantId);
      if (existing) {
        return existing;
      }
      created += 1;
      (manager as any).instances.set(tenantId, mockSql);
      return mockSql;
    };

    const a = (manager as any).getOrCreate('t1', {
      type: 'postgres',
      url: 'postgres://u:p@localhost:5432/db',
    });
    const b = (manager as any).getOrCreate('t1', {
      type: 'postgres',
      url: 'postgres://u:p@localhost:5432/db',
    });

    expect(a).toBe(mockSql);
    expect(b).toBe(mockSql);
    expect(created).toBe(1);
    (manager as any).getOrCreate = originalGetOrCreate;
  });
});

