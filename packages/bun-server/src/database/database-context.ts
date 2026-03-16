import { AsyncLocalStorage } from 'node:async_hooks';

import type { TransactionStatus } from './orm/transaction-types';
import type { SqliteAdapter } from './sqlite-adapter';

export type SqlTemplateCall = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<unknown>;

export interface ReservedSqlSession extends SqlTemplateCall {
  begin<T>(fn: () => Promise<T>): Promise<T>;
  release(): Promise<void> | void;
}

export interface TransactionState {
  id: string;
  status: TransactionStatus;
  level: number;
  savepoints: string[];
}

export interface DatabaseSession {
  reserved?: ReservedSqlSession;
  sqlite?: SqliteAdapter;
  tenantId: string;
  transaction?: TransactionState;
  lazyReserve?: () => Promise<ReservedSqlSession>;
}

export const databaseSessionStore = new AsyncLocalStorage<DatabaseSession>();

export function getCurrentSession(): DatabaseSession | undefined {
  return databaseSessionStore.getStore();
}

export function runWithSession<T>(
  session: DatabaseSession,
  fn: () => Promise<T>,
): Promise<T> {
  return databaseSessionStore.run(session, fn);
}

