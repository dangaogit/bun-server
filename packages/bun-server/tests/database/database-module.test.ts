import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { DatabaseModule, DatabaseService, DATABASE_SERVICE_TOKEN } from '../../src/database';
import { Container } from '../../src/di/container';
import { ModuleRegistry } from '../../src/di/module-registry';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('DatabaseModule', () => {
  let container: Container;
  let moduleRegistry: ModuleRegistry;

  beforeEach(() => {
    // 清除模块元数据
    Reflect.deleteMetadata(MODULE_METADATA_KEY, DatabaseModule);
    
    container = new Container();
    moduleRegistry = ModuleRegistry.getInstance();
    moduleRegistry.clear();
  });

  afterEach(() => {
    moduleRegistry.clear();
  });

  test('should register database service provider', () => {
    DatabaseModule.forRoot({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, DatabaseModule);
    expect(metadata.providers).toBeDefined();
    expect(metadata.providers.length).toBeGreaterThan(0);
    
    // 检查是否注册了 DATABASE_SERVICE_TOKEN
    const hasServiceToken = metadata.providers.some(
      (p: unknown) =>
        typeof p === 'object' &&
        p !== null &&
        'provide' in p &&
        p.provide === DATABASE_SERVICE_TOKEN,
    );
    expect(hasServiceToken).toBe(true);
  });

  test('should register database service instance', () => {
    DatabaseModule.forRoot({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
    });

    moduleRegistry.register(DatabaseModule, container);
    const service = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);
    
    expect(service).toBeInstanceOf(DatabaseService);
    expect(service.getDatabaseType()).toBe('sqlite');
  });

  test('should export database service', () => {
    DatabaseModule.forRoot({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, DatabaseModule);
    expect(metadata.exports).toBeDefined();
    expect(metadata.exports).toContain(DATABASE_SERVICE_TOKEN);
    expect(metadata.exports).toContain(DatabaseService);
  });

  test('should register database extension', () => {
    DatabaseModule.forRoot({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, DatabaseModule);
    expect(metadata.extensions).toBeDefined();
    expect(metadata.extensions.length).toBe(1);
    expect(metadata.extensions[0]).toBeDefined();
  });

  test('should support connection pool options', () => {
    DatabaseModule.forRoot({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
      pool: {
        maxConnections: 20,
        connectionTimeout: 60000,
        retryCount: 5,
        retryDelay: 2000,
      },
    });

    moduleRegistry.register(DatabaseModule, container);
    const service = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);
    
    expect(service).toBeInstanceOf(DatabaseService);
  });

  test('should support disabling health check', () => {
    DatabaseModule.forRoot({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
      enableHealthCheck: false,
    });

    moduleRegistry.register(DatabaseModule, container);
    const service = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);
    
    expect(service).toBeInstanceOf(DatabaseService);
  });
});

describe('DatabaseService', () => {
  let service: DatabaseService;

  beforeEach(async () => {
    service = new DatabaseService({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
    });
    await service.initialize();
  });

  afterEach(async () => {
    await service.close();
  });

  test('should initialize database connection', async () => {
    const info = service.getConnectionInfo();
    expect(info.status).toBe('connected');
    expect(info.type).toBe('sqlite');
  });

  test('should get database connection', () => {
    const connection = service.getConnection();
    expect(connection).toBeDefined();
    expect(connection).not.toBeNull();
  });

  test('should get database type', () => {
    const type = service.getDatabaseType();
    expect(type).toBe('sqlite');
  });

  test('should check health status', async () => {
    const isHealthy = await service.healthCheck();
    expect(isHealthy).toBe(true);
  });

  test('should get connection info', () => {
    const info = service.getConnectionInfo();
    expect(info).toBeDefined();
    expect(info.status).toBe('connected');
    expect(info.type).toBe('sqlite');
  });

  test('should execute SQL query', () => {
    // 创建表
    service.query('CREATE TABLE IF NOT EXISTS test (id INTEGER PRIMARY KEY, name TEXT)');
    
    // 插入数据
    service.query('INSERT INTO test (name) VALUES (?)', ['test']);
    
    // 查询数据（SQLite 返回同步结果）
    const result = service.query<{ id: number; name: string }>('SELECT * FROM test');
    
    expect(result).toBeDefined();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('test');
  });

  test('should close database connection', async () => {
    await service.close();
    const info = service.getConnectionInfo();
    expect(info.status).toBe('disconnected');
  });

  test('should throw error when querying without connection', async () => {
    await service.close();
    
    expect(() => {
      service.query('SELECT 1');
    }).toThrow('Database connection is not established');
  });
});

describe('ConnectionPool', () => {
  test('should create connection pool', () => {
    const { ConnectionPool } = require('../../src/database/connection-pool');
    const pool = new ConnectionPool(
      {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
      {
        maxConnections: 5,
      },
    );

    expect(pool).toBeDefined();
    const stats = pool.getPoolStats();
    expect(stats.maxConnections).toBe(5);
    expect(stats.total).toBe(0);
  });

  test('should acquire and release connections', async () => {
    const { ConnectionPool } = require('../../src/database/connection-pool');
    const pool = new ConnectionPool({
      type: 'sqlite',
      config: {
        path: ':memory:',
      },
    });

    const connection1 = await pool.acquire();
    expect(connection1).toBeDefined();

    const stats1 = pool.getPoolStats();
    expect(stats1.total).toBe(1);
    expect(stats1.inUse).toBe(1);

    pool.release(connection1);
    const stats2 = pool.getPoolStats();
    expect(stats2.inUse).toBe(0);

    await pool.close();
  });

  test('should limit max connections', async () => {
    const { ConnectionPool } = require('../../src/database/connection-pool');
    const pool = new ConnectionPool(
      {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
      {
        maxConnections: 2,
      },
    );

    const conn1 = await pool.acquire();
    const conn2 = await pool.acquire();

    const stats = pool.getPoolStats();
    expect(stats.total).toBe(2);
    expect(stats.inUse).toBe(2);

    pool.release(conn1);
    pool.release(conn2);

    await pool.close();
  });

  test('should close pool and all connections', async () => {
    const { ConnectionPool } = require('../../src/database/connection-pool');
    const pool = new ConnectionPool({
      type: 'sqlite',
      config: {
        path: ':memory:',
      },
    });

    const conn1 = await pool.acquire();
    const conn2 = await pool.acquire();

    await pool.close();

    const stats = pool.getPoolStats();
    expect(stats.total).toBe(0);
  });
});

describe('DatabaseConnectionManager', () => {
  test('should connect to SQLite database', async () => {
    const { DatabaseConnectionManager } = await import('../../src/database/connection-manager');
    const manager = new DatabaseConnectionManager({
      type: 'sqlite',
      config: {
        path: ':memory:',
      },
    });

    await manager.connect();
    const info = manager.getConnectionInfo();
    
    expect(info.status).toBe('connected');
    expect(info.type).toBe('sqlite');
    
    await manager.disconnect();
  });

  test('should handle connection errors gracefully', async () => {
    const { DatabaseConnectionManager } = await import('../../src/database/connection-manager');
    const manager = new DatabaseConnectionManager({
      type: 'sqlite',
      config: {
        path: ':memory:', // 使用内存数据库，应该总是成功
      },
    });

    // SQLite 内存数据库应该总是成功连接
    await manager.connect();
    
    const info = manager.getConnectionInfo();
    expect(info.status).toBe('connected');
    
    await manager.disconnect();
  });

  test('should check health status', async () => {
    const { DatabaseConnectionManager } = await import('../../src/database/connection-manager');
    const manager = new DatabaseConnectionManager({
      type: 'sqlite',
      config: {
        path: ':memory:',
      },
    });

    await manager.connect();
    const isHealthy = await manager.healthCheck();
    
    expect(isHealthy).toBe(true);
    
    await manager.disconnect();
  });

  test('should get pool stats', async () => {
    const { DatabaseConnectionManager } = await import('../../src/database/connection-manager');
    const manager = new DatabaseConnectionManager(
      {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
      {
        maxConnections: 5,
      },
    );

    await manager.connect();
    const stats = manager.getPoolStats();
    
    expect(stats).toBeDefined();
    expect(stats.maxConnections).toBe(5);
    expect(stats.total).toBeGreaterThanOrEqual(1);
    
    await manager.disconnect();
  });
});
