import { Module, MODULE_METADATA_KEY, type ModuleProvider } from '../di/module';
import { type AsyncModuleOptions, registerAsyncProviders } from '../di/async-module';
import type { Constructor } from '@/core/types';
import type { Middleware } from '../middleware';

import { DatabaseExtension } from './database-extension';
import { DatabaseHealthIndicator } from './health-indicator';
import { OrmService } from './orm/service';
import { TransactionManager } from './orm/transaction-manager';
import { TRANSACTION_METADATA_KEY } from './orm/transaction-decorator';
import { DatabaseService } from './service';
import {
  BUN_SQL_MANAGER_TOKEN,
  DB_TOKEN,
  DATABASE_OPTIONS_TOKEN,
  DATABASE_SERVICE_TOKEN,
  SQLITE_MANAGER_TOKEN,
  type BunSQLConfig,
  type DatabaseModuleOptions,
  type SqliteV2Config,
} from './types';
import { ORM_SERVICE_TOKEN } from './orm/types';
import { TRANSACTION_SERVICE_TOKEN } from './orm/transaction-types';
import { BunSQLManager } from './sql-manager';
import { SqliteManager } from './sqlite-adapter';
import { db, initDbProxy } from './db-proxy';
import { getDbStrategy } from './strategy-decorator';
import { runWithSession, type DatabaseSession } from './database-context';

@Module({
  providers: [],
})
export class DatabaseModule {
  private static isBunSqlType(
    type: DatabaseModuleOptions['type'] | undefined,
  ): type is 'postgres' | 'mysql' {
    return type === 'postgres' || type === 'mysql';
  }

  public static normalizeConfig(
    options: DatabaseModuleOptions,
  ): Array<{ tenantId: string; config: BunSQLConfig | SqliteV2Config }> {
    if (options.tenants && options.tenants.length > 0) {
      return options.tenants.map((tenant) => ({
        tenantId: tenant.id,
        config: tenant.config,
      }));
    }

    if (options.database?.type === 'sqlite') {
      if (options.pool) {
        console.warn('[DatabaseModule] pool options are ignored for SQLite');
      }
      return [
        {
          tenantId: options.defaultTenant ?? 'default',
          config: {
            type: 'sqlite',
            database: options.database.config.path,
            wal: options.wal ?? true,
            maxWriteConcurrency: options.maxWriteConcurrency ?? 1,
          },
        },
      ];
    }

    if (options.database?.type === 'postgres' || options.database?.type === 'mysql') {
      const db = options.database;
      const protocol = db.type === 'mysql' ? 'mysql' : 'postgres';
      const url =
        `${protocol}://${db.config.user}:${db.config.password}@${db.config.host}:${db.config.port}/${db.config.database}`;
      return [
        {
          tenantId: options.defaultTenant ?? 'default',
          config: {
            type: db.type,
            url,
            pool: options.bunSqlPool,
          },
        },
      ];
    }

    if (options.type === 'sqlite') {
      return [
        {
          tenantId: options.defaultTenant ?? 'default',
          config: {
            type: 'sqlite',
            database: options.databasePath ?? ':memory:',
            wal: options.wal ?? true,
            maxWriteConcurrency: options.maxWriteConcurrency ?? 1,
          },
        },
      ];
    }

    if (options.url && DatabaseModule.isBunSqlType(options.type)) {
      return [
        {
          tenantId: options.defaultTenant ?? 'default',
          config: {
            type: options.type,
            url: options.url,
            pool: options.bunSqlPool,
          },
        },
      ];
    }

    if (options.host && DatabaseModule.isBunSqlType(options.type)) {
      const protocol = options.type === 'mysql' ? 'mysql' : 'postgres';
      const url =
        `${protocol}://${options.username}:${options.password}@${options.host}:${options.port ?? 5432}/${options.databasePath ?? ''}`;
      return [
        {
          tenantId: options.defaultTenant ?? 'default',
          config: {
            type: options.type,
            url,
            pool: options.bunSqlPool,
          },
        },
      ];
    }

    throw new Error(
      '[DatabaseModule] invalid configuration: specify tenants or single tenant connection options',
    );
  }

  private static createDatabaseMiddleware(
    options: DatabaseModuleOptions,
    normalized: Array<{ tenantId: string; config: BunSQLConfig | SqliteV2Config }>,
    sqlManager: BunSQLManager,
    sqliteManager: SqliteManager,
  ): Middleware {
    const defaultStrategy = options.defaultStrategy ?? 'pool';
    const defaultTenant = options.defaultTenant ?? normalized[0]?.tenantId ?? 'default';

    return async (context, next) => {
      const routeHandler = (context as any).routeHandler as
        | { controller: Constructor<unknown>; method: string }
        | undefined;

      let strategy: 'pool' | 'session' = defaultStrategy;
      if (routeHandler) {
        const routeStrategy = getDbStrategy(
          routeHandler.controller,
          routeHandler.method,
        );
        const hasTx = Boolean(
          Reflect.getMetadata(
            TRANSACTION_METADATA_KEY,
            routeHandler.controller.prototype,
            routeHandler.method,
          ),
        );
        strategy = routeStrategy ?? (hasTx ? 'session' : defaultStrategy);
      }

      if (strategy !== 'session') {
        return await next();
      }

      const selected = normalized.find((item) => item.tenantId === defaultTenant) ?? normalized[0];
      if (!selected) {
        return await next();
      }

      if (selected.config.type === 'sqlite') {
        const sqlite = sqliteManager.getAdapter(selected.tenantId);
        return await runWithSession(
          {
            tenantId: selected.tenantId,
            sqlite,
          },
          async () => await next(),
        );
      }

      const sql = sqlManager.getOrCreate(selected.tenantId, selected.config);
      let reserved: any;
      const session: DatabaseSession = {
        tenantId: selected.tenantId,
        lazyReserve: async () => {
          if (!reserved) {
            reserved = await (sql as any).reserve();
            session.reserved = reserved;
          }
          return reserved;
        },
      };

      try {
        return await runWithSession(session, async () => await next());
      } finally {
        if (reserved) {
          await reserved.release().catch(() => undefined);
        }
      }
    };
  }

  /**
   * 创建数据库模块
   * @param options - 模块配置
   */
  public static forRoot(
    options: DatabaseModuleOptions,
  ): typeof DatabaseModule {
    const providers: ModuleProvider[] = [];
    const normalized = DatabaseModule.normalizeConfig(options);
    const sqlManager = new BunSQLManager();
    const sqliteManager = new SqliteManager();

    for (const item of normalized) {
      if (item.config.type === 'sqlite') {
        sqliteManager.getOrCreate(item.tenantId, item.config);
      } else {
        sqlManager.getOrCreate(item.tenantId, item.config);
      }
    }
    sqlManager.setDefaultTenant(options.defaultTenant ?? normalized[0]?.tenantId ?? 'default');
    sqliteManager.setDefaultTenant(options.defaultTenant ?? normalized[0]?.tenantId ?? 'default');

    const legacyOptions: DatabaseModuleOptions = options.database
      ? options
      : {
          ...options,
          database:
            normalized[0]?.config.type === 'sqlite'
              ? {
                  type: 'sqlite',
                  config: {
                    path: (normalized[0].config as SqliteV2Config).database,
                  },
                }
              : {
                  type: (normalized[0]?.config.type ?? 'postgres') as 'postgres' | 'mysql',
                  config: {
                    host: options.host ?? 'localhost',
                    port: options.port ?? (normalized[0]?.config.type === 'mysql' ? 3306 : 5432),
                    database: options.databasePath ?? 'default',
                    user: options.username ?? 'root',
                    password: options.password ?? '',
                  },
                },
        };

    const service = new DatabaseService(legacyOptions);
    const transactionManager = new TransactionManager(sqlManager);
    initDbProxy(sqlManager, transactionManager);

    providers.push(
      {
        provide: DATABASE_SERVICE_TOKEN,
        useValue: service,
      },
      {
        provide: DATABASE_OPTIONS_TOKEN,
        useValue: options,
      },
      {
        provide: DatabaseService,
        useValue: service,
      },
      {
        provide: BUN_SQL_MANAGER_TOKEN,
        useValue: sqlManager,
      },
      {
        provide: SQLITE_MANAGER_TOKEN,
        useValue: sqliteManager,
      },
      {
        provide: DB_TOKEN,
        useValue: db,
      },
    );

    // 如果启用了 ORM，注册 ORM 服务
    if (options.orm?.enabled) {
      const ormService = new OrmService(service, {
        enabled: true,
        drizzle: options.orm.drizzle,
        databaseService: service,
      });
      providers.push(
        {
          provide: ORM_SERVICE_TOKEN,
          useValue: ormService,
        },
        OrmService,
      );
    }

    // 注册事务管理器（总是注册，即使 ORM 未启用）
    providers.push(
      {
        provide: TRANSACTION_SERVICE_TOKEN,
        useValue: transactionManager,
      },
      {
        provide: TransactionManager,
        useValue: transactionManager,
      },
    );

    // 数据库健康检查指示器可以通过 DatabaseModule.createHealthIndicator() 方法获取
    // 然后在 HealthModule.forRoot() 中手动添加

    // 动态更新模块元数据
    const existingMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, DatabaseModule) || {};
    
    // 创建数据库扩展，用于在应用启动时初始化连接
    const databaseExtension = new DatabaseExtension(sqlManager, sqliteManager);
    const middleware = DatabaseModule.createDatabaseMiddleware(
      options,
      normalized,
      sqlManager,
      sqliteManager,
    );
    
    const metadata = {
      ...existingMetadata,
      providers: [...(existingMetadata.providers || []), ...providers],
      exports: [
        ...(existingMetadata.exports || []),
        DATABASE_SERVICE_TOKEN,
        DATABASE_OPTIONS_TOKEN,
        DatabaseService,
        TRANSACTION_SERVICE_TOKEN,
        TransactionManager,
        ...(options.orm?.enabled
          ? [ORM_SERVICE_TOKEN, OrmService]
          : []),
      ],
      extensions: [
        ...(existingMetadata.extensions || []),
        databaseExtension,
      ],
      middlewares: [
        ...(existingMetadata.middlewares || []),
        middleware,
      ],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, DatabaseModule);

    return DatabaseModule;
  }

  /**
   * 异步创建数据库模块
   * 允许通过工厂函数异步提供配置（如从 ConfigService 获取数据库连接信息）
   * @param asyncOptions - 异步配置选项
   */
  public static forRootAsync(
    asyncOptions: AsyncModuleOptions<DatabaseModuleOptions>,
  ): typeof DatabaseModule {
    const tokenMap = new Map<symbol, (config: DatabaseModuleOptions) => unknown>();
    tokenMap.set(DATABASE_SERVICE_TOKEN, (config) => new DatabaseService(config));
    tokenMap.set(DATABASE_OPTIONS_TOKEN, (config) => config);

    return registerAsyncProviders(
      DatabaseModule,
      asyncOptions,
      tokenMap,
    ) as typeof DatabaseModule;
  }

  /**
   * 创建数据库健康检查指示器
   * 用于在 HealthModule 中注册数据库健康检查
   * @param databaseService - 数据库服务实例
   * @returns 数据库健康检查指示器
   */
  public static createHealthIndicator(
    databaseService: DatabaseService,
  ): DatabaseHealthIndicator {
    return new DatabaseHealthIndicator(databaseService);
  }
}
