export { DatabaseModule } from './database-module';
export { DatabaseService } from './service';
export { DatabaseConnectionManager } from './connection-manager';
export { ConnectionPool } from './connection-pool';
export { DatabaseHealthIndicator } from './health-indicator';
export { DatabaseExtension } from './database-extension';
export { BunSQLManager } from './sql-manager';
export { SqliteAdapter, SqliteManager, Semaphore } from './sqlite-adapter';
export {
  db,
  initDbProxy,
  type DbProxy,
} from './db-proxy';
export {
  DbStrategy,
  Session as DbSession,
  DB_STRATEGY_KEY,
  getDbStrategy,
  type DbStrategyType,
} from './strategy-decorator';
export {
  databaseSessionStore,
  getCurrentSession,
  runWithSession,
  type DatabaseSession,
  type TransactionState,
  type ReservedSqlSession,
} from './database-context';
export {
  BUN_SQL_MANAGER_TOKEN,
  DB_TOKEN,
  DATABASE_OPTIONS_TOKEN,
  DATABASE_SERVICE_TOKEN,
  SQLITE_MANAGER_TOKEN,
  type BunSQLConfig,
  type BunSQLPoolOptions,
  type ConnectionInfo,
  type ConnectionPoolOptions,
  type DatabaseConfig,
  type DatabaseModuleOptions,
  type DatabaseType,
  type MysqlConfig,
  type PostgresConfig,
  type SqliteV2Config,
  type SqliteConfig,
  type TenantConfig,
} from './types';
// ORM 导出
export {
  Entity,
  Column,
  PrimaryKey,
  Repository,
  BaseRepository,
  DrizzleBaseRepository,
  OrmService,
  ORM_SERVICE_TOKEN,
  getEntityMetadata,
  getColumnMetadata,
  getRepositoryMetadata,
  type OrmModuleOptions,
  type BaseRepository as BaseRepositoryInterface,
  type EntityMetadata,
  type ColumnMetadata,
  // Transaction exports
  Transactional,
  TransactionManager,
  TransactionInterceptor,
  Propagation,
  IsolationLevel,
  TransactionStatus,
  TRANSACTION_SERVICE_TOKEN,
  getTransactionMetadata,
  type TransactionOptions,
  type TransactionContext,
} from './orm';
