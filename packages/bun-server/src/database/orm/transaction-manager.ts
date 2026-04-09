import { Inject, Injectable } from '../../di/decorators';
import { getCurrentSession, runWithSession } from '../database-context';
import { BUN_SQL_MANAGER_TOKEN } from '../types';
import type { BunSQLManager } from '../sql-manager';
import {
  IsolationLevel,
  TransactionStatus,
  type TransactionOptions,
  type TransactionContext,
} from './transaction-types';

/**
 * 事务管理器
 * 管理数据库事务的生命周期
 */
@Injectable()
export class TransactionManager {
  public constructor(
    @Inject(BUN_SQL_MANAGER_TOKEN)
    private readonly sqlManager: BunSQLManager,
  ) {}

  /**
   * 在当前 session 中执行事务
   */
  public async runInTransaction<T>(
    fn: () => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    const session = getCurrentSession();
    if (!session) {
      throw new Error(
        '[TransactionManager] No database session in current request context',
      );
    }

    if (session.sqlite) {
      return await this.runInSqliteTransaction(fn);
    }

    let reserved = session.reserved;
    if (!reserved && session.lazyReserve) {
      reserved = await session.lazyReserve();
    }
    if (!reserved) {
      throw new Error(
        '[TransactionManager] No reserved session in current context. Add @Session() or @DbStrategy("session").',
      );
    }

    const transactionId = this.generateTransactionId();
    session.transaction = {
      id: transactionId,
      status: TransactionStatus.ACTIVE,
      level: 0,
      savepoints: [],
    };

    if (options.isolationLevel) {
      const isolationLevel = this.getIsolationLevelSQL(options.isolationLevel);
      if (isolationLevel) {
        await reserved`SET TRANSACTION ISOLATION LEVEL ${isolationLevel}`;
      }
    }

    try {
      const result = await reserved.begin(fn);
      if (session.transaction) {
        session.transaction.status = TransactionStatus.COMMITTED;
      }
      return result;
    } catch (error) {
      if (session.transaction) {
        session.transaction.status = TransactionStatus.ROLLED_BACK;
      }
      throw error;
    } finally {
      session.transaction = undefined;
    }
  }

  /**
   * REQUIRES_NEW：使用独立连接开启新事务
   */
  public async runInNewTransaction<T>(
    fn: () => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    const reserved = await (this.sqlManager.getDefault() as any).reserve();
    try {
      const tenantId = getCurrentSession()?.tenantId ?? 'default';
      return await runWithSession(
        {
          tenantId,
          reserved: reserved as any,
        },
        () => this.runInTransaction(fn, options),
      );
    } finally {
      await reserved.release();
    }
  }

  public async runInNestedTransaction<T>(
    fn: () => Promise<T>,
    options: TransactionOptions = {},
  ): Promise<T> {
    const session = getCurrentSession();
    if (!session?.transaction || !session.reserved) {
      throw new Error(
        '[TransactionManager] NESTED propagation requires an active transaction',
      );
    }

    const savepointName = `sp_${session.transaction.level}_${Date.now()}`;
    session.transaction.level += 1;
    session.transaction.savepoints.push(savepointName);

    await session.reserved`SAVEPOINT ${savepointName}`;
    try {
      return await fn();
    } catch (error) {
      if (this.shouldRollback(error, options)) {
        await session.reserved`ROLLBACK TO SAVEPOINT ${savepointName}`;
      }
      throw error;
    } finally {
      session.transaction.level = Math.max(0, session.transaction.level - 1);
      session.transaction.savepoints = session.transaction.savepoints.filter(
        (item) => item !== savepointName,
      );
    }
  }

  public getCurrentTransaction(): TransactionContext | null {
    const tx = getCurrentSession()?.transaction;
    if (!tx) {
      return null;
    }
    return {
      id: tx.id,
      status: tx.status,
      startTime: 0,
      level: tx.level,
      savepoints: tx.savepoints,
    };
  }

  public hasActiveTransaction(): boolean {
    const tx = this.getCurrentTransaction();
    return tx?.status === TransactionStatus.ACTIVE;
  }

  public async runInSqliteTransaction<T>(fn: () => Promise<T>): Promise<T> {
    const session = getCurrentSession();
    if (!session?.sqlite) {
      throw new Error(
        '[TransactionManager] No sqlite adapter found in current request context',
      );
    }

    using _lock = await session.sqlite.semaphore.acquire();
    await session.sqlite.execute('BEGIN TRANSACTION');
    try {
      const result = await fn();
      await session.sqlite.execute('COMMIT');
      return result;
    } catch (error) {
      await session.sqlite.execute('ROLLBACK');
      throw error;
    }
  }

  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  private getIsolationLevelSQL(level: IsolationLevel): string {
    const levelMap: Record<IsolationLevel, string> = {
      [IsolationLevel.READ_UNCOMMITTED]: 'READ UNCOMMITTED',
      [IsolationLevel.READ_COMMITTED]: 'READ COMMITTED',
      [IsolationLevel.REPEATABLE_READ]: 'REPEATABLE READ',
      [IsolationLevel.SERIALIZABLE]: 'SERIALIZABLE',
    };
    return levelMap[level];
  }

  private shouldRollback(
    error: unknown,
    options: Pick<TransactionOptions, 'rollbackFor' | 'noRollbackFor'>,
  ): boolean {
    if (options.noRollbackFor && options.noRollbackFor.length > 0) {
      for (const ErrorClass of options.noRollbackFor) {
        if (error instanceof ErrorClass) {
          return false;
        }
      }
    }
    if (options.rollbackFor && options.rollbackFor.length > 0) {
      for (const ErrorClass of options.rollbackFor) {
        if (error instanceof ErrorClass) {
          return true;
        }
      }
      return false;
    }
    return true;
  }
}
