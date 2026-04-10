import type {
  ConnectionPoolOptions,
  DatabaseConfig,
  DatabaseType,
} from './types';
import { getRuntime } from '../platform/runtime';

/**
 * 连接池中的连接项
 */
interface PoolConnection {
  /**
   * 连接对象
   */
  connection: unknown;
  /**
   * 是否正在使用
   */
  inUse: boolean;
  /**
   * 创建时间
   */
  createdAt: number;
  /**
   * 最后使用时间
   */
  lastUsedAt: number;
}

/**
 * 数据库连接池
 * 管理数据库连接的创建、复用和销毁
 */
export class ConnectionPool {
  private config: DatabaseConfig;
  private options: Required<ConnectionPoolOptions>;
  private connections: PoolConnection[] = [];
  private pendingConnections: Set<Promise<unknown>> = new Set();
  private isClosing = false;

  public constructor(
    config: DatabaseConfig,
    options: ConnectionPoolOptions = {},
  ) {
    this.config = config;
    this.options = {
      maxConnections: options.maxConnections ?? 10,
      connectionTimeout: options.connectionTimeout ?? 30000,
      retryCount: options.retryCount ?? 3,
      retryDelay: options.retryDelay ?? 1000,
    };
  }

  /**
   * 获取连接（从池中获取或创建新连接）
   */
  public async acquire(): Promise<unknown> {
    if (this.isClosing) {
      throw new Error('Connection pool is closing');
    }

    // 查找空闲连接
    const idleConnection = this.connections.find((conn) => !conn.inUse);
    if (idleConnection) {
      idleConnection.inUse = true;
      idleConnection.lastUsedAt = Date.now();
      return idleConnection.connection;
    }

    // 如果未达到最大连接数，创建新连接
    if (this.connections.length < this.options.maxConnections) {
      const connection = await this.createConnection();
      const poolConnection: PoolConnection = {
        connection,
        inUse: true,
        createdAt: Date.now(),
        lastUsedAt: Date.now(),
      };
      this.connections.push(poolConnection);
      return connection;
    }

    // 等待连接可用（简单的轮询等待）
    return await this.waitForConnection();
  }

  /**
   * 释放连接回池中
   */
  public release(connection: unknown): void {
    const poolConnection = this.connections.find(
      (conn) => conn.connection === connection,
    );
    if (poolConnection) {
      poolConnection.inUse = false;
      poolConnection.lastUsedAt = Date.now();
    }
  }

  /**
   * 关闭连接池
   */
  public async close(): Promise<void> {
    this.isClosing = true;

    // 等待所有待处理的连接完成
    await Promise.all(Array.from(this.pendingConnections));

    // 关闭所有连接
    const closePromises = this.connections.map((poolConnection) =>
      this.closeConnection(poolConnection.connection),
    );
    await Promise.all(closePromises);

    this.connections = [];
    this.isClosing = false;
  }

  /**
   * 获取连接并返回 Disposable 对象，支持 `await using` 语法（Bun 1.3.12+ / TC39 Explicit Resource Management）
   *
   * @example
   * await using { connection } = await pool.acquireDisposable();
   * // 作用域结束时自动调用 release，无需手动释放
   */
  public async acquireDisposable(): Promise<{ connection: unknown } & Disposable> {
    const connection = await this.acquire();
    return {
      connection,
      [Symbol.dispose]: () => this.release(connection),
    };
  }

  /**
   * 获取池状态信息
   */
  public getPoolStats(): {
    total: number;
    inUse: number;
    idle: number;
    maxConnections: number;
  } {
    const inUse = this.connections.filter((conn) => conn.inUse).length;
    return {
      total: this.connections.length,
      inUse,
      idle: this.connections.length - inUse,
      maxConnections: this.options.maxConnections,
    };
  }

  /**
   * 创建新连接
   */
  private async createConnection(): Promise<unknown> {
    const createPromise = this.createConnectionWithRetry();
    this.pendingConnections.add(createPromise);

    try {
      const connection = await createPromise;
      return connection;
    } finally {
      this.pendingConnections.delete(createPromise);
    }
  }

  /**
   * 带重试的连接创建
   */
  private async createConnectionWithRetry(): Promise<unknown> {
    let lastError: Error | undefined;

    for (let i = 0; i <= this.options.retryCount; i++) {
      try {
        if (this.config.type === 'sqlite') {
          return await this.createSqliteConnection(this.config.config);
        } else if (this.config.type === 'postgres') {
          return await this.createPostgresConnection(this.config.config);
        } else if (this.config.type === 'mysql') {
          return await this.createMysqlConnection(this.config.config);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (i < this.options.retryCount) {
          await this.sleep(this.options.retryDelay);
        }
      }
    }

    throw lastError ?? new Error('Failed to create database connection');
  }

  /**
   * 创建 SQLite 连接（自动感知运行时）
   */
  private async createSqliteConnection(
    config: { path: string },
  ): Promise<unknown> {
    if (getRuntime().engine === 'bun') {
      const { Database } = await import('bun:sqlite');
      return new Database(config.path);
    }
    // Node.js：使用 @vscode/sqlite3（可选对等依赖，需用户自行安装）
    let sqlite3: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      sqlite3 = require('@vscode/sqlite3');
    } catch {
      throw new Error(
        '[bun-server] SQLite on Node.js requires @vscode/sqlite3.\n' +
        'Install it with: bun add @vscode/sqlite3@5.1.12-vscode',
      );
    }
    return new sqlite3.Database(config.path);
  }

  /**
   * 创建 PostgreSQL 连接（自动感知运行时）
   */
  private async createPostgresConnection(
    config: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
      ssl?: boolean;
    },
  ): Promise<unknown> {
    const url = `postgres://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
    if (getRuntime().engine === 'bun') {
      const { SQL } = await import('bun');
      return new SQL(url, { max: 1, tls: config.ssl ?? false });
    }
    // Node.js：使用 postgres 包
    const postgres = require('postgres') as typeof import('postgres');
    return postgres(url, { max: 1, ssl: config.ssl ? 'require' : false });
  }

  /**
   * 创建 MySQL 连接（自动感知运行时）
   */
  private async createMysqlConnection(
    config: {
      host: string;
      port: number;
      database: string;
      user: string;
      password: string;
    },
  ): Promise<unknown> {
    if (getRuntime().engine === 'bun') {
      const url = `mysql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}`;
      const { SQL } = await import('bun');
      return new SQL(url, { max: 1 });
    }
    // Node.js：使用 mysql2 包
    const mysql2 = require('mysql2/promise') as typeof import('mysql2/promise');
    const conn = await mysql2.createConnection({
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
    });
    return conn;
  }

  /**
   * 关闭连接
   */
  private async closeConnection(connection: unknown): Promise<void> {
    const dbType = this.config.type;
    if (dbType === 'sqlite') {
      await this.closeSqliteConnection(connection);
    } else if (dbType === 'postgres') {
      await this.closePostgresConnection(connection);
    } else if (dbType === 'mysql') {
      await this.closeMysqlConnection(connection);
    }
  }

  /**
   * 关闭 SQLite 连接
   */
  private async closeSqliteConnection(connection: unknown): Promise<void> {
    if (
      connection &&
      typeof connection === 'object' &&
      'close' in connection &&
      typeof connection.close === 'function'
    ) {
      (connection as { close: () => void }).close();
    }
  }

  /**
   * 关闭 PostgreSQL 连接（Bun.SQL 会自动管理连接）
   */
  private async closePostgresConnection(_connection: unknown): Promise<void> {
    // Bun.SQL 会自动管理连接池，这里不需要手动关闭
    // 如果需要强制关闭，可以调用 connection.close()
    if (
      _connection &&
      typeof _connection === 'object' &&
      'close' in _connection &&
      typeof (_connection as { close: () => void }).close === 'function'
    ) {
      (_connection as { close: () => void }).close();
    }
  }

  /**
   * 关闭 MySQL 连接（Bun.SQL 会自动管理连接）
   */
  private async closeMysqlConnection(_connection: unknown): Promise<void> {
    // Bun.SQL 会自动管理连接池，这里不需要手动关闭
    // 如果需要强制关闭，可以调用 connection.close()
    if (
      _connection &&
      typeof _connection === 'object' &&
      'close' in _connection &&
      typeof (_connection as { close: () => void }).close === 'function'
    ) {
      (_connection as { close: () => void }).close();
    }
  }

  /**
   * 等待连接可用
   */
  private async waitForConnection(): Promise<unknown> {
    const startTime = Date.now();
    const timeout = this.options.connectionTimeout;

    while (Date.now() - startTime < timeout) {
      const idleConnection = this.connections.find((conn) => !conn.inUse);
      if (idleConnection) {
        idleConnection.inUse = true;
        idleConnection.lastUsedAt = Date.now();
        return idleConnection.connection;
      }

      await this.sleep(100); // 等待 100ms 后重试
    }

    throw new Error(
      `Connection timeout: No available connection within ${timeout}ms`,
    );
  }

  /**
   * 睡眠函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
