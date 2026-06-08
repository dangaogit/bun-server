import type {
  ConnectionInfo,
  ConnectionPoolOptions,
  ConnectionStatus,
  DatabaseConfig,
  DatabaseType,
} from './types';

import { ConnectionPool } from './connection-pool';
import { healthCheckViaDriver } from './driver';

/**
 * 数据库连接管理器
 * 负责管理数据库连接池和连接健康检查
 */
export class DatabaseConnectionManager {
  private config: DatabaseConfig;
  private poolOptions: ConnectionPoolOptions;
  private pool: ConnectionPool;
  private currentConnection: unknown | null = null;
  private status: ConnectionStatus = 'disconnected';
  private error: string | undefined;

  public constructor(
    config: DatabaseConfig,
    poolOptions: ConnectionPoolOptions = {},
  ) {
    this.config = config;
    this.poolOptions = {
      maxConnections: poolOptions.maxConnections ?? 10,
      connectionTimeout: poolOptions.connectionTimeout ?? 30000,
      retryCount: poolOptions.retryCount ?? 3,
      retryDelay: poolOptions.retryDelay ?? 1000,
    };
    this.pool = new ConnectionPool(config, this.poolOptions);
  }

  /**
   * 连接数据库（从连接池获取连接）
   */
  public async connect(): Promise<void> {
    if (this.status === 'connected') {
      return;
    }

    this.status = 'connecting';

    try {
      // 从连接池获取连接
      this.currentConnection = await this.pool.acquire();
      this.status = 'connected';
      this.error = undefined;
    } catch (error) {
      this.status = 'error';
      this.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * 断开数据库连接（释放连接回池中）
   */
  public async disconnect(): Promise<void> {
    if (this.status === 'disconnected' || !this.currentConnection) {
      return;
    }

    try {
      // 释放连接回池中
      this.pool.release(this.currentConnection);
      this.currentConnection = null;
      this.status = 'disconnected';
      this.error = undefined;
    } catch (error) {
      this.status = 'error';
      this.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  /**
   * 关闭连接池（关闭所有连接）
   */
  public async closePool(): Promise<void> {
    await this.pool.close();
    this.currentConnection = null;
    this.status = 'disconnected';
    this.error = undefined;
  }

  /**
   * 检查数据库连接健康状态
   */
  public async healthCheck(): Promise<boolean> {
    if (this.status !== 'connected' || !this.currentConnection) {
      return false;
    }

    try {
      if (this.config.type === 'sqlite') {
        return await this.healthCheckSqlite(this.currentConnection);
      } else if (this.config.type === 'postgres') {
        return await this.healthCheckPostgres(this.currentConnection);
      } else if (this.config.type === 'mysql') {
        return await this.healthCheckMysql(this.currentConnection);
      }
      return false;
    } catch (_error) {
      return false;
    }
  }

  /**
   * 获取连接池统计信息
   */
  public getPoolStats() {
    return this.pool.getPoolStats();
  }

  /**
   * 获取连接信息
   */
  public getConnectionInfo(): ConnectionInfo {
    return {
      status: this.status,
      type: this.config.type,
      error: this.error,
    };
  }

  /**
   * 获取原始连接对象
   */
  public getConnection(): unknown {
    return this.currentConnection;
  }

  /**
   * 从连接池获取新连接（用于需要独立连接的场景）
   */
  public async acquireConnection(): Promise<unknown> {
    return await this.pool.acquire();
  }

  /**
   * 释放连接回池中
   */
  public releaseConnection(connection: unknown): void {
    this.pool.release(connection);
  }

  /**
   * 获取数据库类型
   */
  public getDatabaseType(): DatabaseType {
    return this.config.type;
  }

  /**
   * SQLite 健康检查
   */
  private async healthCheckSqlite(connection: unknown): Promise<boolean> {
    try {
      if (!connection || typeof connection !== 'object') {
        return false;
      }

      // bun:sqlite Database（有 .query() 但没有 callback-based .all()）
      if ('query' in connection && typeof (connection as any).query === 'function' && !('all' in connection && 'run' in connection)) {
        const db = connection as { query: (sql: string) => { all: () => unknown[] } };
        db.query('SELECT 1').all();
        return true;
      }

      // @vscode/sqlite3 Database（callback-based .all()）
      if ('all' in connection && typeof (connection as any).all === 'function') {
        await new Promise<void>((resolve, reject) => {
          (connection as any).all('SELECT 1', [], (err: Error | null) => {
            if (err) reject(err);
            else resolve();
          });
        });
        return true;
      }

      return false;
    } catch (_error) {
      return false;
    }
  }

  /**
   * PostgreSQL 健康检查（按连接 driver tag 分流）
   */
  private async healthCheckPostgres(connection: unknown): Promise<boolean> {
    return await healthCheckViaDriver(connection);
  }

  /**
   * MySQL 健康检查（按连接 driver tag 分流）
   */
  private async healthCheckMysql(connection: unknown): Promise<boolean> {
    return await healthCheckViaDriver(connection);
  }
}
