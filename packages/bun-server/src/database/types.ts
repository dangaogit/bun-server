/**
 * 数据库类型
 */
export type DatabaseType = 'sqlite' | 'postgres' | 'mysql';

/**
 * SQLite 配置
 */
export interface SqliteConfig {
  /**
   * 数据库文件路径（相对或绝对路径）
   * 例如：':memory:' 表示内存数据库，'./data.db' 表示文件数据库
   */
  path: string;
}

/**
 * PostgreSQL 配置
 */
export interface PostgresConfig {
  /**
   * 数据库主机
   */
  host: string;
  /**
   * 数据库端口
   */
  port: number;
  /**
   * 数据库名称
   */
  database: string;
  /**
   * 用户名
   */
  user: string;
  /**
   * 密码
   */
  password: string;
  /**
   * SSL 配置（可选）
   */
  ssl?: boolean;
}

/**
 * MySQL 配置
 */
export interface MysqlConfig {
  /**
   * 数据库主机
   */
  host: string;
  /**
   * 数据库端口
   */
  port: number;
  /**
   * 数据库名称
   */
  database: string;
  /**
   * 用户名
   */
  user: string;
  /**
   * 密码
   */
  password: string;
}

/**
 * 数据库配置（联合类型）
 */
export type DatabaseConfig =
  | { type: 'sqlite'; config: SqliteConfig }
  | { type: 'postgres'; config: PostgresConfig }
  | { type: 'mysql'; config: MysqlConfig };

/**
 * Bun.SQL 连接池配置
 */
export interface BunSQLPoolOptions {
  /**
   * 最大物理连接数
   * @default 10
   */
  max?: number;
  /**
   * 空闲连接超时（秒）
   * @default 30
   */
  idleTimeout?: number;
  /**
   * 连接最大生存时间（秒）
   * @default 0
   */
  maxLifetime?: number;
  /**
   * 获取连接超时（毫秒）
   * @default 30000
   */
  connectionTimeout?: number;
}

/**
 * Bun.SQL 配置（Postgres/MySQL）
 */
export interface BunSQLConfig {
  type: 'postgres' | 'mysql';
  url: string;
  pool?: BunSQLPoolOptions;
}

/**
 * SQLite V2 配置
 */
export interface SqliteV2Config {
  type: 'sqlite';
  database: string;
  wal?: boolean;
  maxWriteConcurrency?: number;
}

/**
 * 多租户配置
 */
export interface TenantConfig {
  id: string;
  config: BunSQLConfig | SqliteV2Config;
}

/**
 * 连接池配置
 */
export interface ConnectionPoolOptions {
  /**
   * 最大连接数
   * @default 10
   */
  maxConnections?: number;
  /**
   * 连接超时时间（毫秒）
   * @default 30000
   */
  connectionTimeout?: number;
  /**
   * 连接重试次数
   * @default 3
   */
  retryCount?: number;
  /**
   * 重试延迟（毫秒）
   * @default 1000
   */
  retryDelay?: number;
}

/**
 * DatabaseModule 配置选项
 */
export interface DatabaseModuleOptions {
  /**
   * 全局默认连接策略
   * - pool: 每次查询走共享池（默认）
   * - session: 首次查询惰性 reserve，整个请求复用同一连接
   * @default "pool"
   */
  defaultStrategy?: 'pool' | 'session';

  /**
   * 多租户配置
   */
  tenants?: TenantConfig[];
  /**
   * 默认租户 ID
   * @default "default"
   */
  defaultTenant?: string;

  /**
   * 单租户：数据库类型（V2）
   */
  type?: DatabaseType;
  /**
   * 单租户：Postgres/MySQL URL（V2）
   */
  url?: string;
  /**
   * 单租户：SQLite 文件路径（V2）
   */
  databasePath?: string;
  /**
   * 单租户：SQLite WAL 模式
   * @default true
   */
  wal?: boolean;
  /**
   * 单租户：SQLite 最大写并发
   * @default 1
   */
  maxWriteConcurrency?: number;
  /**
   * Bun.SQL 连接池参数（V2）
   */
  bunSqlPool?: BunSQLPoolOptions;

  /**
   * 数据库配置
   * @deprecated 使用 V2 字段（type/url/databasePath）或 tenants
   */
  database?: DatabaseConfig;
  /**
   * 连接池配置
   * @deprecated 旧连接池配置，仅用于兼容旧 DatabaseService
   */
  pool?: ConnectionPoolOptions;
  /**
   * 是否启用连接健康检查
   * @default true
   */
  enableHealthCheck?: boolean;
  /**
   * ORM 配置（可选）
   */
  orm?: {
    /**
     * 是否启用 ORM
     * @default false
     */
    enabled?: boolean;
    /**
     * Drizzle 数据库实例（如果使用 Drizzle ORM）
     */
    drizzle?: unknown;
  };

  /**
   * @deprecated 旧字段兼容（用于构造 URL）
   */
  host?: string;
  /**
   * @deprecated 旧字段兼容（用于构造 URL）
   */
  port?: number;
  /**
   * @deprecated 旧字段兼容（用于构造 URL）
   */
  username?: string;
  /**
   * @deprecated 旧字段兼容（用于构造 URL）
   */
  password?: string;
}

/**
 * 数据库连接状态
 */
export type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

/**
 * 数据库连接信息
 */
export interface ConnectionInfo {
  /**
   * 连接状态
   */
  status: ConnectionStatus;
  /**
   * 数据库类型
   */
  type: DatabaseType;
  /**
   * 连接错误信息（如果有）
   */
  error?: string;
}

/**
 * DatabaseService Token
 */
export const DATABASE_SERVICE_TOKEN = Symbol('@dangao/bun-server:database:service');

/**
 * DatabaseModule Options Token
 */
export const DATABASE_OPTIONS_TOKEN = Symbol('@dangao/bun-server:database:options');

/**
 * BunSQLManager Token
 */
export const BUN_SQL_MANAGER_TOKEN = Symbol('@dangao/bun-server:database:bun-sql-manager');

/**
 * SQLite manager Token
 */
export const SQLITE_MANAGER_TOKEN = Symbol('@dangao/bun-server:database:sqlite-manager');

/**
 * db proxy Token
 */
export const DB_TOKEN = Symbol('@dangao/bun-server:database:db');
