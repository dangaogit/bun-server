import { afterEach, beforeEach, describe, expect, test } from 'bun:test';

import {
  BUN_SQL_MANAGER_TOKEN,
  DB_TOKEN,
  DATABASE_OPTIONS_TOKEN,
  DATABASE_SERVICE_TOKEN,
  DatabaseModule,
  SQLITE_MANAGER_TOKEN,
} from '../../src/database';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('DatabaseModule V2', () => {
  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, DatabaseModule);
  });

  afterEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, DatabaseModule);
  });

  test('should normalize sqlite legacy config', () => {
    const normalized = DatabaseModule.normalizeConfig({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
    });
    expect(normalized.length).toBe(1);
    expect(normalized[0]?.config.type).toBe('sqlite');
  });

  test('should normalize postgres url config', () => {
    const normalized = DatabaseModule.normalizeConfig({
      type: 'postgres',
      url: 'postgres://user:pass@localhost:5432/db',
      bunSqlPool: {
        max: 20,
      },
    });
    expect(normalized[0]?.config.type).toBe('postgres');
    if (normalized[0]?.config.type === 'postgres') {
      expect(normalized[0].config.pool?.max).toBe(20);
    }
  });

  test('should normalize tenants config', () => {
    const normalized = DatabaseModule.normalizeConfig({
      tenants: [
        {
          id: 'tenant-a',
          config: {
            type: 'postgres',
            url: 'postgres://u:p@localhost:5432/a',
          },
        },
        {
          id: 'tenant-b',
          config: {
            type: 'sqlite',
            database: ':memory:',
          },
        },
      ],
    });
    expect(normalized.length).toBe(2);
    expect(normalized[0]?.tenantId).toBe('tenant-a');
    expect(normalized[1]?.tenantId).toBe('tenant-b');
  });

  test('should register v2 providers and middleware', () => {
    DatabaseModule.forRoot({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
      defaultStrategy: 'pool',
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, DatabaseModule);
    expect(metadata).toBeDefined();
    expect(metadata.providers).toBeDefined();
    expect(metadata.middlewares).toBeDefined();
    expect(metadata.middlewares.length).toBeGreaterThan(0);

    const hasDbToken = metadata.providers.some(
      (provider: unknown) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        (provider as { provide: unknown }).provide === DB_TOKEN,
    );
    const hasBunSqlManager = metadata.providers.some(
      (provider: unknown) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        (provider as { provide: unknown }).provide === BUN_SQL_MANAGER_TOKEN,
    );
    const hasSqliteManager = metadata.providers.some(
      (provider: unknown) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        (provider as { provide: unknown }).provide === SQLITE_MANAGER_TOKEN,
    );
    const hasLegacyService = metadata.providers.some(
      (provider: unknown) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        (provider as { provide: unknown }).provide === DATABASE_SERVICE_TOKEN,
    );
    const hasOptionsToken = metadata.providers.some(
      (provider: unknown) =>
        typeof provider === 'object' &&
        provider !== null &&
        'provide' in provider &&
        (provider as { provide: unknown }).provide === DATABASE_OPTIONS_TOKEN,
    );

    expect(hasDbToken).toBe(true);
    expect(hasBunSqlManager).toBe(true);
    expect(hasSqliteManager).toBe(true);
    expect(hasLegacyService).toBe(true);
    expect(hasOptionsToken).toBe(true);
  });
});
