import type { Container } from '../../di/container';
import type { Context } from '../../core/context';
import type { Interceptor } from '../../interceptor';
import { TRANSACTION_SERVICE_TOKEN } from './transaction-types';
import { TransactionManager } from './transaction-manager';
import { getTransactionMetadata } from './transaction-decorator';
import { Propagation } from './transaction-types';

/**
 * 事务拦截器
 * 在方法调用时检查 @Transactional() 装饰器并执行事务逻辑
 * 实现 Interceptor 接口，通过拦截器机制注册和执行
 */
export class TransactionInterceptor implements Interceptor {
  /**
   * 执行拦截器逻辑
   * 实现 Interceptor 接口
   */
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    const transactionMetadata = getTransactionMetadata(target, propertyKey);

    // 如果没有事务元数据，直接执行原方法
    if (!transactionMetadata) {
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 获取事务管理器
    let transactionManager: TransactionManager;
    try {
      transactionManager = container.resolve<TransactionManager>(
        TRANSACTION_SERVICE_TOKEN,
      );
    } catch (error) {
      // 如果没有注册事务管理器，直接执行原方法
      console.warn('TransactionManager not found, executing without transaction');
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    const propagation = transactionMetadata.propagation ?? Propagation.REQUIRED;
    const currentTransaction = transactionManager.getCurrentTransaction();

    // 根据传播行为决定事务策略
    switch (propagation) {
      case Propagation.REQUIRED:
        if (currentTransaction) {
          // 加入现有事务
          return await Promise.resolve(originalMethod.apply(target, args));
        } else {
          // 创建新事务
          return await transactionManager.runInTransaction(
            async () => await Promise.resolve(originalMethod.apply(target, args)),
            transactionMetadata,
          );
        }

      case Propagation.REQUIRES_NEW:
        // 总是创建新事务
        return await transactionManager.runInNewTransaction(
          async () => await Promise.resolve(originalMethod.apply(target, args)),
          transactionMetadata,
        );

      case Propagation.SUPPORTS:
        if (currentTransaction) {
          // 加入现有事务
          return await Promise.resolve(originalMethod.apply(target, args));
        } else {
          // 非事务执行
          return await Promise.resolve(originalMethod.apply(target, args));
        }

      case Propagation.NOT_SUPPORTED:
        // 非事务执行
        return await Promise.resolve(originalMethod.apply(target, args));

      case Propagation.NEVER:
        if (currentTransaction) {
          throw new Error(
            'Transaction propagation NEVER requires no existing transaction',
          );
        }
        return await Promise.resolve(originalMethod.apply(target, args));

      case Propagation.NESTED:
        if (currentTransaction) {
          // 创建嵌套事务（保存点）
          return await transactionManager.runInNestedTransaction(
            async () => await Promise.resolve(originalMethod.apply(target, args)),
            transactionMetadata,
          );
        } else {
          // 创建新事务
          return await transactionManager.runInTransaction(
            async () => await Promise.resolve(originalMethod.apply(target, args)),
            transactionMetadata,
          );
        }

      default:
        return await Promise.resolve(originalMethod.apply(target, args));
    }
  }

  /**
   * 执行带事务的方法（静态方法，保持向后兼容）
   * @deprecated 使用拦截器机制，此方法保留用于向后兼容
   */
  public static async executeWithTransaction<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
  ): Promise<T> {
    const interceptor = new TransactionInterceptor();
    return await interceptor.execute(target, propertyKey, originalMethod, args, container);
  }

}
