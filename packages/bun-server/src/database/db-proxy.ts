import type { BunSQLManager } from './sql-manager';
import { getCurrentSession } from './database-context';
import type { TransactionManager } from './orm/transaction-manager';

type DbResult = Promise<unknown>;

export interface DbProxy {
  (strings: TemplateStringsArray, ...values: unknown[]): DbResult;
  transaction<T>(fn: () => Promise<T>): Promise<T>;
  tenant(tenantId: string): DbProxy;
}

let sqlManagerRef: BunSQLManager | undefined;
let txManagerRef: TransactionManager | undefined;

export function initDbProxy(
  sqlManager: BunSQLManager,
  txManager: TransactionManager,
): void {
  sqlManagerRef = sqlManager;
  txManagerRef = txManager;
}

function ensureReady(): { sqlManager: BunSQLManager; txManager: TransactionManager } {
  if (!sqlManagerRef || !txManagerRef) {
    throw new Error(
      '[db] proxy is not initialized. Ensure DatabaseModule.forRoot() is called before using db.',
    );
  }
  return { sqlManager: sqlManagerRef, txManager: txManagerRef };
}

const baseDb = async (
  tenantId: string | undefined,
  strings: TemplateStringsArray,
  ...values: unknown[]
): DbResult => {
  const session = getCurrentSession();
  if (session?.reserved) {
    return await session.reserved(strings, ...values);
  }

  if (session?.lazyReserve) {
    const reserved = await session.lazyReserve();
    return await reserved(strings, ...values);
  }

  const { sqlManager } = ensureReady();
  if (tenantId) {
    const tenantSql = sqlManager.get(tenantId);
    if (tenantSql) {
      return await tenantSql(strings, ...values);
    }
  }
  return await sqlManager.getDefault()(strings, ...values);
};

function createDb(tenantId?: string): DbProxy {
  const fn = (async (
    strings: TemplateStringsArray,
    ...values: unknown[]
  ) => baseDb(tenantId, strings, ...values)) as DbProxy;

  fn.transaction = async <T>(txFn: () => Promise<T>): Promise<T> => {
    const { txManager } = ensureReady();
    return await txManager.runInTransaction(txFn);
  };

  fn.tenant = (id: string): DbProxy => createDb(id);

  return fn;
}

export const db: DbProxy = createDb();

