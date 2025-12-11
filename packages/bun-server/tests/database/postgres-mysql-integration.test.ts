import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import {
  DatabaseModule,
  DatabaseService,
  DATABASE_SERVICE_TOKEN,
} from '../../src/database';
import { Container } from '../../src/di/container';
import { ModuleRegistry } from '../../src/di/module-registry';
import { MODULE_METADATA_KEY } from '../../src/di/module';
import 'reflect-metadata';

/**
 * PostgreSQL/MySQL 集成测试
 * 
 * 这些测试需要实际的数据库连接，通过环境变量配置：
 * - POSTGRES_URL: PostgreSQL 连接字符串（可选）
 * - MYSQL_URL: MySQL 连接字符串（可选）
 * 
 * 如果没有配置相应的环境变量，相关测试会被跳过。
 */

function parseDatabaseUrl(url: string): {
  type: 'postgres' | 'mysql';
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
} {
  const urlObj = new URL(url);
  return {
    type: urlObj.protocol === 'postgresql:' || urlObj.protocol === 'postgres:' ? 'postgres' : 'mysql',
    host: urlObj.hostname,
    port: Number(urlObj.port) || (urlObj.protocol.includes('postgres') ? 5432 : 3306),
    database: urlObj.pathname.slice(1),
    user: urlObj.username,
    password: urlObj.password,
  };
}

describe('PostgreSQL Integration Tests', () => {
  const postgresUrl = process.env.POSTGRES_URL;
  const hasPostgres = !!postgresUrl;

  let container: Container;
  let moduleRegistry: ModuleRegistry;
  let dbService: DatabaseService | null = null;

  beforeEach(() => {
    if (!hasPostgres) {
      return;
    }

    Reflect.deleteMetadata(MODULE_METADATA_KEY, DatabaseModule);
    container = new Container();
    moduleRegistry = ModuleRegistry.getInstance();
    moduleRegistry.clear();
  });

  afterEach(async () => {
    if (dbService) {
      try {
        await dbService.closePool();
      } catch {
        // Ignore errors during cleanup
      }
      dbService = null;
    }
    if (moduleRegistry) {
      moduleRegistry.clear();
    }
  });

  test.skipIf(!hasPostgres)('should connect to PostgreSQL database', async () => {

    const config = parseDatabaseUrl(postgresUrl!);

    DatabaseModule.forRoot({
      database: {
        type: 'postgres',
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        },
      },
    });

    moduleRegistry.register(DatabaseModule, container);
    dbService = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);

    await dbService.initialize();

    const info = dbService.getConnectionInfo();
    expect(info.status).toBe('connected');
    expect(info.type).toBe('postgres');
  });

  test.skipIf(!hasPostgres)('should execute PostgreSQL queries', async () => {

    const config = parseDatabaseUrl(postgresUrl!);

    DatabaseModule.forRoot({
      database: {
        type: 'postgres',
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        },
      },
    });

    moduleRegistry.register(DatabaseModule, container);
    dbService = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);

    await dbService.initialize();

    // 测试查询
    const result = await dbService.query('SELECT version() as version');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('version');
  });

  test.skipIf(!hasPostgres)('should handle PostgreSQL transactions', async () => {

    const config = parseDatabaseUrl(postgresUrl!);

    DatabaseModule.forRoot({
      database: {
        type: 'postgres',
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        },
      },
    });

    moduleRegistry.register(DatabaseModule, container);
    dbService = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);

    await dbService.initialize();

    // 创建测试表
    await dbService.query(`
      CREATE TABLE IF NOT EXISTS test_transaction_pg (
        id SERIAL PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    try {
      // 开始事务
      await dbService.query('BEGIN');
      
      // 插入数据
      await dbService.query(
        "INSERT INTO test_transaction_pg (value) VALUES ('test')",
      );

      // 回滚事务
      await dbService.query('ROLLBACK');

      // 验证数据未插入
      const result = await dbService.query<{ count: number | string }>(
        "SELECT COUNT(*) as count FROM test_transaction_pg WHERE value = 'test'",
      );
      const countValue = Array.isArray(result) && result.length > 0
        ? result[0]?.count
        : 0;
      const count = typeof countValue === 'string' ? parseInt(countValue, 10) : (countValue || 0);
      expect(count).toBe(0);
    } finally {
      // 清理测试表
      try {
        await dbService.query('DROP TABLE IF EXISTS test_transaction_pg');
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test.skipIf(!hasPostgres)('should check PostgreSQL health status', async () => {

    const config = parseDatabaseUrl(postgresUrl!);

    DatabaseModule.forRoot({
      database: {
        type: 'postgres',
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        },
      },
      enableHealthCheck: true,
    });

    moduleRegistry.register(DatabaseModule, container);
    dbService = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);

    await dbService.initialize();

    const isHealthy = await dbService.healthCheck();
    expect(isHealthy).toBe(true);
  });
});

describe('MySQL Integration Tests', () => {
  const mysqlUrl = process.env.MYSQL_URL;
  const hasMysql = !!mysqlUrl;

  let container: Container;
  let moduleRegistry: ModuleRegistry;
  let dbService: DatabaseService | null = null;

  beforeEach(() => {
    if (!hasMysql) {
      return;
    }

    Reflect.deleteMetadata(MODULE_METADATA_KEY, DatabaseModule);
    container = new Container();
    moduleRegistry = ModuleRegistry.getInstance();
    moduleRegistry.clear();
  });

  afterEach(async () => {
    if (dbService) {
      try {
        await dbService.closePool();
      } catch {
        // Ignore errors during cleanup
      }
      dbService = null;
    }
    if (moduleRegistry) {
      moduleRegistry.clear();
    }
  });

  test.skipIf(!hasMysql)('should connect to MySQL database', async () => {

    const config = parseDatabaseUrl(mysqlUrl!);

    DatabaseModule.forRoot({
      database: {
        type: 'mysql',
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        },
      },
    });

    moduleRegistry.register(DatabaseModule, container);
    dbService = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);

    await dbService.initialize();

    const info = dbService.getConnectionInfo();
    expect(info.status).toBe('connected');
    expect(info.type).toBe('mysql');
  });

  test.skipIf(!hasMysql)('should execute MySQL queries', async () => {

    const config = parseDatabaseUrl(mysqlUrl!);

    DatabaseModule.forRoot({
      database: {
        type: 'mysql',
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        },
      },
    });

    moduleRegistry.register(DatabaseModule, container);
    dbService = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);

    await dbService.initialize();

    // 测试查询
    const result = await dbService.query('SELECT VERSION() as version');
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('version');
  });

  test.skipIf(!hasMysql)('should handle MySQL transactions', async () => {

    const config = parseDatabaseUrl(mysqlUrl!);

    DatabaseModule.forRoot({
      database: {
        type: 'mysql',
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        },
      },
    });

    moduleRegistry.register(DatabaseModule, container);
    dbService = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);

    await dbService.initialize();

    // 创建测试表
    await dbService.query(`
      CREATE TABLE IF NOT EXISTS test_transaction_mysql (
        id INT AUTO_INCREMENT PRIMARY KEY,
        value TEXT NOT NULL
      )
    `);

    try {
      // 开始事务
      await dbService.query('START TRANSACTION');
      
      // 插入数据
      await dbService.query(
        "INSERT INTO test_transaction_mysql (value) VALUES ('test')",
      );

      // 回滚事务
      await dbService.query('ROLLBACK');

      // 验证数据未插入
      const result = await dbService.query<{ count: number | string }>(
        "SELECT COUNT(*) as count FROM test_transaction_mysql WHERE value = 'test'",
      );
      const countValue = Array.isArray(result) && result.length > 0
        ? result[0]?.count
        : 0;
      const count = typeof countValue === 'string' ? parseInt(countValue, 10) : (countValue || 0);
      expect(count).toBe(0);
    } finally {
      // 清理测试表
      try {
        await dbService.query('DROP TABLE IF EXISTS test_transaction_mysql');
      } catch {
        // Ignore cleanup errors
      }
    }
  });

  test.skipIf(!hasMysql)('should check MySQL health status', async () => {

    const config = parseDatabaseUrl(mysqlUrl!);

    DatabaseModule.forRoot({
      database: {
        type: 'mysql',
        config: {
          host: config.host,
          port: config.port,
          database: config.database,
          user: config.user,
          password: config.password,
        },
      },
      enableHealthCheck: true,
    });

    moduleRegistry.register(DatabaseModule, container);
    dbService = container.resolve<DatabaseService>(DATABASE_SERVICE_TOKEN);

    await dbService.initialize();

    const isHealthy = await dbService.healthCheck();
    expect(isHealthy).toBe(true);
  });
});
