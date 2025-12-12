import type { Container } from '../../di/container';
import type { Context } from '../../core/context';
import type { Interceptor } from '../../interceptor';
import { TRANSACTION_SERVICE_TOKEN } from './transaction-types';
import { TransactionManager } from './transaction-manager';
import { getTransactionMetadata, TRANSACTION_METADATA_KEY } from './transaction-decorator';
import { Propagation, TransactionStatus } from './transaction-types';

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
          return await TransactionInterceptor.executeInExistingTransaction(
            originalMethod,
            target,
            args,
            currentTransaction.id,
            transactionManager,
          );
        } else {
          // 创建新事务
          return await TransactionInterceptor.executeInNewTransaction(
            originalMethod,
            target,
            args,
            transactionMetadata,
            transactionManager,
          );
        }

      case Propagation.REQUIRES_NEW:
        // 总是创建新事务
        return await TransactionInterceptor.executeInNewTransaction(
          originalMethod,
          target,
          args,
          transactionMetadata,
          transactionManager,
        );

      case Propagation.SUPPORTS:
        if (currentTransaction) {
          // 加入现有事务
          return await TransactionInterceptor.executeInExistingTransaction(
            originalMethod,
            target,
            args,
            currentTransaction.id,
            transactionManager,
          );
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
          return await TransactionInterceptor.executeInNestedTransaction(
            originalMethod,
            target,
            args,
            currentTransaction.id,
            transactionMetadata,
            transactionManager,
          );
        } else {
          // 创建新事务
          return await TransactionInterceptor.executeInNewTransaction(
            originalMethod,
            target,
            args,
            transactionMetadata,
            transactionManager,
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

  /**
   * 在新事务中执行方法
   */
  private static async executeInNewTransaction<T>(
    method: (...args: unknown[]) => T | Promise<T>,
    target: unknown,
    args: unknown[],
    options: {
      timeout?: number;
      rollbackFor?: Array<new () => Error>;
      noRollbackFor?: Array<new () => Error>;
    },
    transactionManager: TransactionManager,
  ): Promise<T> {
    const context = await transactionManager.beginTransaction({
      timeout: options.timeout,
    });

    try {
      const result = await Promise.resolve(method.apply(target, args));
      await transactionManager.commitTransaction(context.id);
      return result;
    } catch (error) {
      // 检查是否需要回滚
      if (this.shouldRollback(error, options.rollbackFor, options.noRollbackFor)) {
        await transactionManager.rollbackTransaction(context.id);
      } else {
        await transactionManager.commitTransaction(context.id);
      }
      throw error;
    }
  }

  /**
   * 在现有事务中执行方法
   */
  private static async executeInExistingTransaction<T>(
    method: (...args: unknown[]) => T | Promise<T>,
    target: unknown,
    args: unknown[],
    transactionId: string,
    transactionManager: TransactionManager,
  ): Promise<T> {
    // 直接执行，不提交或回滚（由外层事务管理）
    return await Promise.resolve(method.apply(target, args));
  }

  /**
   * 在嵌套事务中执行方法
   */
  private static async executeInNestedTransaction<T>(
    method: (...args: unknown[]) => T | Promise<T>,
    target: unknown,
    args: unknown[],
    parentTransactionId: string,
    options: {
      timeout?: number;
      rollbackFor?: Array<new () => Error>;
      noRollbackFor?: Array<new () => Error>;
    },
    transactionManager: TransactionManager,
  ): Promise<T> {
    const savepointName = await transactionManager.createSavepoint(parentTransactionId);

    try {
      const result = await Promise.resolve(method.apply(target, args));
      // 嵌套事务成功，不执行任何操作（保存点保留）
      return result;
    } catch (error) {
      // 检查是否需要回滚到保存点
      if (this.shouldRollback(error, options.rollbackFor, options.noRollbackFor)) {
        await transactionManager.rollbackToSavepoint(parentTransactionId, savepointName);
      }
      throw error;
    }
  }

  /**
   * 判断是否应该回滚
   */
  private static shouldRollback(
    error: unknown,
    rollbackFor?: Array<new () => Error>,
    noRollbackFor?: Array<new () => Error>,
  ): boolean {
    if (!error) {
      return false;
    }

    // 如果指定了 noRollbackFor，且错误匹配，则不回滚
    if (noRollbackFor && noRollbackFor.length > 0) {
      for (const ErrorClass of noRollbackFor) {
        if (error instanceof ErrorClass) {
          return false;
        }
      }
    }

    // 如果指定了 rollbackFor，且错误匹配，则回滚
    if (rollbackFor && rollbackFor.length > 0) {
      for (const ErrorClass of rollbackFor) {
        if (error instanceof ErrorClass) {
          return true;
        }
      }
      // 如果指定了 rollbackFor 但错误不匹配，则不回滚
      return false;
    }

    // 默认情况下，所有错误都回滚
    return true;
  }
}
