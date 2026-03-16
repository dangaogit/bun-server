import { Injectable } from '../di/decorators';

import { DatabaseConnectionManager } from './connection-manager';
import { getCurrentSession } from './database-context';
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
   * SQLite 返回同步结果，PostgreSQL/MySQL 返回异步结果
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
      return this.queryBunSQL(connection, sql, params);
    }

    throw new Error(`Query not supported for database type: ${dbType}`);
  }

  /**
   * SQLite 查询实现
   */
  private querySqlite<T = unknown>(
    connection: unknown,
    sql: string,
    params?: unknown[],
  ): T[] {
    // Bun SQLite Database 对象
    if (
      connection &&
      typeof connection === 'object' &&
      'query' in connection &&
      typeof connection.query === 'function'
    ) {
      const db = connection as {
        query: (sql: string) => {
          all: (...params: unknown[]) => T[];
          get: (...params: unknown[]) => T | undefined;
        };
      };

      const statement = db.query(sql);
      // Bun SQLite 的 all() 方法接受参数
      const result =
        params && params.length > 0 ? statement.all(...params) : statement.all();
      return result;
    }

    throw new Error('Invalid SQLite connection');
  }

  /**
   * Bun.SQL 查询实现（PostgreSQL/MySQL）
   * 通过模板字符串调用 Bun.SQL，确保参数走 Bun.SQL 转义逻辑
   */
  private async queryBunSQL<T = unknown>(
    connection: unknown,
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    // Bun.SQL 对象可以作为函数调用（模板字符串）
    if (connection && typeof connection === 'function') {
      try {
        const { strings, values } = this.buildTemplateFromSql(sql, params);
        const template = Object.assign(strings, {
          raw: strings,
        }) as unknown as TemplateStringsArray;
        const result = await (connection as (
          template: TemplateStringsArray,
          ...values: unknown[]
        ) => Promise<Array<Record<string, unknown>>>)(template, ...values);
        return result as T[];
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        // 如果模板字符串方式失败，保留原始错误，便于排查参数/SQL 构造问题
        throw new Error(
          `Bun.SQL parameterized queries are not fully supported. Consider using template string queries. Original error: ${errorMessage}`,
        );
      }
    }

    // 尝试使用 query 方法（如果存在）
    if (
      connection &&
      typeof connection === 'object' &&
      'query' in connection &&
      typeof connection.query === 'function'
    ) {
      const db = connection as {
        query: (
          sql: string,
          ...params: unknown[]
        ) => Promise<Array<Record<string, unknown>>>;
      };
      const result = await db.query(sql, ...(params ?? []));
      return result as T[];
    }

    throw new Error('Invalid Bun.SQL connection');
  }

  /**
   * 将 SQL 与 ? 占位符参数转换为模板字符串片段
   * 让参数通过 Bun.SQL 的 values 通道注入，避免手工拼接 SQL
   */
  private buildTemplateFromSql(
    sql: string,
    params?: unknown[],
  ): { strings: string[]; values: unknown[] } {
    if (!params || params.length === 0) {
      return { strings: [sql], values: [] };
    }

    const strings = sql.split('?');
    if (strings.length !== params.length + 1) {
      throw new Error(
        'SQL placeholders count does not match parameters count',
      );
    }

    return { strings, values: params };
  }
}
