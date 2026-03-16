import type { Container } from '../di/container';
import type { ApplicationExtension } from '../extensions/types';
import {
  InterceptorRegistry,
  INTERCEPTOR_REGISTRY_TOKEN,
} from '../interceptor';

import { TransactionInterceptor } from './orm/transaction-interceptor';
import { TRANSACTION_METADATA_KEY } from './orm/transaction-decorator';
import type { BunSQLManager } from './sql-manager';
import type { SqliteManager } from './sqlite-adapter';

/**
 * 数据库扩展
 * 注册事务拦截器，并在应用关闭时释放数据库资源
 */
export class DatabaseExtension implements ApplicationExtension {
  public constructor(
    private readonly sqlManager?: BunSQLManager,
    private readonly sqliteManager?: SqliteManager,
  ) {}

  public register(container: Container): void {
    // 注册事务拦截器到拦截器注册表
    try {
      const interceptorRegistry = container.resolve<InterceptorRegistry>(
        INTERCEPTOR_REGISTRY_TOKEN,
      );
      const transactionInterceptor = new TransactionInterceptor();
      // 使用 TRANSACTION_METADATA_KEY 作为元数据键
      // 优先级设置为 50，确保事务拦截器在其他业务拦截器之前执行
      interceptorRegistry.register(
        TRANSACTION_METADATA_KEY,
        transactionInterceptor,
        50,
      );
    } catch (error) {
      // 如果拦截器注册表未注册，忽略错误（向后兼容）
      // 这意味着拦截器机制可能未启用
    }
  }

  /**
   * 关闭数据库资源
   */
  public async close(_container: Container): Promise<void> {
    await this.sqlManager?.destroyAll(10);
    this.sqliteManager?.destroyAll();
  }
}
