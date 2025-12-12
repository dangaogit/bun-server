import { Module, MODULE_METADATA_KEY, type ModuleProvider } from '../di/module';
import type { ApplicationExtension } from '../extensions/types';
import {
  InterceptorRegistry,
  INTERCEPTOR_REGISTRY_TOKEN,
} from '../interceptor';

import { DatabaseExtension } from './database-extension';
import { DatabaseHealthIndicator } from './health-indicator';
import { OrmService } from './orm/service';
import { TransactionManager } from './orm/transaction-manager';
import { TransactionInterceptor } from './orm/transaction-interceptor';
import { TRANSACTION_METADATA_KEY } from './orm/transaction-decorator';
import { DatabaseService } from './service';
import {
  DATABASE_OPTIONS_TOKEN,
  DATABASE_SERVICE_TOKEN,
  type DatabaseModuleOptions,
} from './types';
import { ORM_SERVICE_TOKEN } from './orm/types';
import { TRANSACTION_SERVICE_TOKEN } from './orm/transaction-types';

@Module({
  providers: [],
})
export class DatabaseModule {
  /**
   * 创建数据库模块
   * @param options - 模块配置
   */
  public static forRoot(
    options: DatabaseModuleOptions,
  ): typeof DatabaseModule {
    const providers: ModuleProvider[] = [];

    const service = new DatabaseService(options);

    providers.push(
      {
        provide: DATABASE_SERVICE_TOKEN,
        useValue: service,
      },
      {
        provide: DATABASE_OPTIONS_TOKEN,
        useValue: options,
      },
      DatabaseService,
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
    const transactionManager = new TransactionManager(service);
    providers.push(
      {
        provide: TRANSACTION_SERVICE_TOKEN,
        useValue: transactionManager,
      },
      TransactionManager,
    );

    // 数据库健康检查指示器可以通过 DatabaseModule.createHealthIndicator() 方法获取
    // 然后在 HealthModule.forRoot() 中手动添加

    // 动态更新模块元数据
    const existingMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, DatabaseModule) || {};
    
    // 创建数据库扩展，用于在应用启动时初始化连接
    const databaseExtension = new DatabaseExtension();
    
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
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, DatabaseModule);

    return DatabaseModule;
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
