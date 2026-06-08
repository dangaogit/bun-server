import { Injectable } from '../di/decorators';

import { DatabaseConnectionManager } from './connection-manager';
import { getCurrentSession } from './database-context';
import { queryViaDriver } from './driver';
import type {
  ConnectionInfo,
  DatabaseConfig,
  DatabaseModuleOptions,
} from './types';

/**
 * 数据库服务
 * 提供数据库连接管理和查询接口
 */
@Injectable()
export class DatabaseService {
  private connectionManager: DatabaseConnectionManager;
  private options: DatabaseModuleOptions;

  public constructor(options: DatabaseModuleOptions) {
    this.options = options;
    const databaseConfig: DatabaseConfig =
      options.database ??
      (options.type === 'sqlite'
        ? {
            type: 'sqlite',
            config: {
              path: options.databasePath ?? ':memory:',
            },
          }
        : {
            type: (options.type ?? 'postgres') as 'postgres' | 'mysql',
            config: {
              host: options.host ?? 'localhost',
              port: options.port ?? 5432,
              database: options.databasePath ?? 'default',
              user: options.username ?? 'root',
              password: options.password ?? '',
            },
          });
    this.connectionManager = new DatabaseConnectionManager(
      databaseConfig,
      options.pool,
    );
  }

  /**
   * 初始化数据库连接
   */
  public async initialize(): Promise<void> {
    await this.connectionManager.connect();
  }

  /**
   * 关闭数据库连接（释放回池中）
   */
  public async close(): Promise<void> {
    await this.connectionManager.disconnect();
  }

  /**
   * 关闭连接池（关闭所有连接）
   */
  public async closePool(): Promise<void> {
    await this.connectionManager.closePool();
  }

  /**
   * 获取连接池统计信息
   */
  public getPoolStats() {
    return this.connectionManager.getPoolStats();
  }

  /**
   * 获取数据库连接
   */
  public getConnection(): unknown {
    return this.connectionManager.getConnection();
  }

  /**
   * 获取配置（供 TransactionManager 使用）
   */
  public get config(): DatabaseModuleOptions {
    return this.options;
  }

  /**
   * 获取数据库类型
   */
  public getDatabaseType(): DatabaseConfig['type'] {
    return this.connectionManager.getDatabaseType();
  }

  /**
   * 检查数据库连接健康状态
   */
  public async healthCheck(): Promise<boolean> {
    if (!this.options.enableHealthCheck) {
      return true;
    }

    return await this.connectionManager.healthCheck();
  }

  /**
   * 获取连接信息
   */
  public getConnectionInfo(): ConnectionInfo {
    return this.connectionManager.getConnectionInfo();
  }

  /**
   * 执行 SQL 查询
   * SQLite (bun:sqlite) 返回同步结果；@vscode/sqlite3 / PostgreSQL / MySQL 返回异步结果
   */
  public query<T = unknown>(sql: string, params?: unknown[]): T[] | Promise<T[]> {
    const session = getCurrentSession();
    if (session?.sqlite) {
      return session.sqlite.query<T>(sql, (params ?? []) as any);
    }

    const perRequestConnection = session?.reserved;
    const connection = perRequestConnection ?? this.getConnection();
    if (!connection) {
      throw new Error('Database connection is not established');
    }

    const dbType = this.getDatabaseType();
    if (dbType === 'sqlite') {
      return this.querySqlite(connection, sql, params);
    } else if (dbType === 'postgres' || dbType === 'mysql') {
      // 按连接 driver tag 分流（bun-sql 模板 / mysql2 / postgres）
      return queryViaDriver(connection, sql, params);
    }

    throw new Error(`Query not supported for database type: ${dbType}`);
  }

  /**
   * SQLite 查询实现
   * bun:sqlite 使用同步 .query().all()；@vscode/sqlite3 使用异步 callback .all()
   */
  private querySqlite<T = unknown>(
    connection: unknown,
    sql: string,
    params?: unknown[],
  ): T[] | Promise<T[]> {
    // bun:sqlite Database 对象（有 .query() 方法）
    if (
      connection &&
      typeof connection === 'object' &&
      'query' in connection &&
      typeof (connection as any).query === 'function' &&
      !('all' in connection && 'run' in connection)
    ) {
      const db = connection as {
        query: (sql: string) => {
          all: (...params: unknown[]) => T[];
          get: (...params: unknown[]) => T | undefined;
        };
      };

      const statement = db.query(sql);
      const result =
        params && params.length > 0 ? statement.all(...params) : statement.all();
      return result;
    }

    // @vscode/sqlite3 Database 对象（有 .all() callback 方法）
    if (
      connection &&
      typeof connection === 'object' &&
      'all' in connection &&
      typeof (connection as any).all === 'function'
    ) {
      return new Promise<T[]>((resolve, reject) => {
        (connection as any).all(sql, params ?? [], (err: Error | null, rows: T[]) => {
          if (err) reject(err);
          else resolve(rows ?? []);
        });
      });
    }

    throw new Error('Invalid SQLite connection');
  }
}
