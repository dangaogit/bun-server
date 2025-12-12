import type { Container } from '../di/container';
import type { ApplicationExtension } from '../extensions/types';
import {
  InterceptorRegistry,
  INTERCEPTOR_REGISTRY_TOKEN,
} from '../interceptor';

import { TransactionInterceptor } from './orm/transaction-interceptor';
import { TRANSACTION_METADATA_KEY } from './orm/transaction-decorator';
import { DATABASE_SERVICE_TOKEN } from './types';
import type { DatabaseService } from './service';

/**
 * 数据库扩展
 * 在应用启动时自动初始化数据库连接
 */
export class DatabaseExtension implements ApplicationExtension {
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
   * 初始化数据库连接
   * 应该在应用启动时调用
   */
  public async initialize(container: Container): Promise<void> {
    try {
      const databaseService = container.resolve<DatabaseService>(
        DATABASE_SERVICE_TOKEN,
      );
      await databaseService.initialize();
    } catch (error) {
      // 如果 DatabaseService 未注册，忽略错误
      // 这意味着用户可能没有使用 DatabaseModule
      if (
        error instanceof Error &&
        error.message.includes('Provider not found')
      ) {
        return;
      }
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   * 应该在应用停止时调用
   */
  public async close(container: Container): Promise<void> {
    try {
      const databaseService = container.resolve<DatabaseService>(
        DATABASE_SERVICE_TOKEN,
      );
      // 关闭连接池（关闭所有连接）
      await databaseService.closePool();
    } catch (error) {
      // 如果 DatabaseService 未注册，忽略错误
      if (
        error instanceof Error &&
        error.message.includes('Provider not found')
      ) {
        return;
      }
      throw error;
    }
  }
}
