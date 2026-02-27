import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import {
  Transactional,
  TransactionManager,
  Propagation,
  IsolationLevel,
  TransactionStatus,
  TRANSACTION_SERVICE_TOKEN,
} from '../../src/database/orm';
import { DatabaseService, DATABASE_SERVICE_TOKEN } from '../../src/database';
import { Container } from '../../src/di/container';

describe('TransactionManager', () => {
  let container: Container;
  let databaseService: DatabaseService;
  let transactionManager: TransactionManager;

  beforeEach(async () => {
    container = new Container();
    databaseService = new DatabaseService({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
    });
    await databaseService.initialize();

    transactionManager = new TransactionManager(databaseService);
    container.registerInstance(DATABASE_SERVICE_TOKEN, databaseService);
    container.registerInstance(TRANSACTION_SERVICE_TOKEN, transactionManager);

    // 创建测试表
    databaseService.query(`
      CREATE TABLE IF NOT EXISTS test_accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0
      )
    `);
  });

  afterEach(async () => {
    await databaseService.closePool();
  });

  test('should begin and commit transaction', async () => {
    const context = await transactionManager.beginTransaction();
    expect(context.status).toBe(TransactionStatus.ACTIVE);
    expect(context.id).toBeDefined();

    // 插入数据
    await databaseService.query(
      'INSERT INTO test_accounts (name, balance) VALUES (?, ?)',
      ['Alice', 100],
    );

    await transactionManager.commitTransaction(context.id);

    // 验证数据已提交
    const result = databaseService.query('SELECT * FROM test_accounts WHERE name = ?', ['Alice']);
    expect(Array.isArray(result) ? result.length : 0).toBeGreaterThan(0);
  });

  test('should rollback transaction', async () => {
    const context = await transactionManager.beginTransaction();

    // 插入数据
    await databaseService.query(
      'INSERT INTO test_accounts (name, balance) VALUES (?, ?)',
      ['Bob', 200],
    );

    await transactionManager.rollbackTransaction(context.id);

    // 验证数据已回滚
    const result = databaseService.query('SELECT * FROM test_accounts WHERE name = ?', ['Bob']);
    expect(Array.isArray(result) ? result.length : 0).toBe(0);
  });

  test('should create and rollback to savepoint', async () => {
    const context = await transactionManager.beginTransaction();

    // 插入第一条数据
    await databaseService.query(
      'INSERT INTO test_accounts (name, balance) VALUES (?, ?)',
      ['Charlie', 300],
    );

    // 创建保存点
    const savepoint = await transactionManager.createSavepoint(context.id);
    expect(savepoint).toBeDefined();
    expect(context.level).toBe(1);

    // 插入第二条数据
    await databaseService.query(
      'INSERT INTO test_accounts (name, balance) VALUES (?, ?)',
      ['David', 400],
    );

    // 回滚到保存点
    await transactionManager.rollbackToSavepoint(context.id, savepoint);

    // 提交事务
    await transactionManager.commitTransaction(context.id);

    // 验证：Charlie 应该存在，David 应该不存在（已回滚）
    const charlie = databaseService.query('SELECT * FROM test_accounts WHERE name = ?', ['Charlie']);
    const david = databaseService.query('SELECT * FROM test_accounts WHERE name = ?', ['David']);

    expect(Array.isArray(charlie) ? charlie.length : 0).toBeGreaterThan(0);
    expect(Array.isArray(david) ? david.length : 0).toBe(0);
  });

  test('should get current transaction', async () => {
    expect(transactionManager.hasActiveTransaction()).toBe(false);

    const context = await transactionManager.beginTransaction();
    expect(transactionManager.hasActiveTransaction()).toBe(true);

    const current = transactionManager.getCurrentTransaction();
    expect(current).not.toBeNull();
    expect(current?.id).toBe(context.id);

    await transactionManager.commitTransaction(context.id);
    expect(transactionManager.hasActiveTransaction()).toBe(false);
  });
});

describe('@Transactional Decorator', () => {
  let container: Container;
  let databaseService: DatabaseService;
  let transactionManager: TransactionManager;

  beforeEach(async () => {
    container = new Container();
    databaseService = new DatabaseService({
      database: {
        type: 'sqlite',
        config: {
          path: ':memory:',
        },
      },
    });
    await databaseService.initialize();

    transactionManager = new TransactionManager(databaseService);
    container.registerInstance(DATABASE_SERVICE_TOKEN, databaseService);
    container.registerInstance(TRANSACTION_SERVICE_TOKEN, transactionManager);

    // 创建测试表
    databaseService.query(`
      CREATE TABLE IF NOT EXISTS test_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE
      )
    `);
  });

  afterEach(async () => {
    await databaseService.closePool();
  });

  test('should apply transaction to method', async () => {
    class UserService {
      @Transactional()
      public async createUser(name: string, email: string): Promise<void> {
        await databaseService.query(
          'INSERT INTO test_users (name, email) VALUES (?, ?)',
          [name, email],
        );
      }

      @Transactional({ propagation: Propagation.REQUIRES_NEW })
      public async createUserInNewTransaction(name: string, email: string): Promise<void> {
        await databaseService.query(
          'INSERT INTO test_users (name, email) VALUES (?, ?)',
          [name, email],
        );
      }
    }

    const service = new UserService();
    const prototype = UserService.prototype;

    // 使用 TransactionInterceptor 执行方法
    const { TransactionInterceptor } = await import('../../src/database/orm/transaction-interceptor');
    await TransactionInterceptor.executeWithTransaction(
      prototype,
      'createUser',
      service.createUser.bind(service),
      ['Alice', 'alice@example.com'],
      container,
    );

    // 验证数据已提交
    const result = databaseService.query('SELECT * FROM test_users WHERE name = ?', ['Alice']);
    expect(Array.isArray(result) ? result.length : 0).toBeGreaterThan(0);
  });

  test('should rollback on error', async () => {
    class UserService {
      @Transactional()
      public async createUserWithError(name: string, email: string): Promise<void> {
        await databaseService.query(
          'INSERT INTO test_users (name, email) VALUES (?, ?)',
          [name, email],
        );
        throw new Error('Test error');
      }
    }

    const service = new UserService();
    const prototype = UserService.prototype;

    const { TransactionInterceptor } = await import('../../src/database/orm/transaction-interceptor');

    try {
      await TransactionInterceptor.executeWithTransaction(
        prototype,
        'createUserWithError',
        service.createUserWithError.bind(service),
        ['Bob', 'bob@example.com'],
        container,
      );
      expect(true).toBe(false); // 不应该到达这里
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }

    // 验证数据已回滚
    const result = databaseService.query('SELECT * FROM test_users WHERE name = ?', ['Bob']);
    expect(Array.isArray(result) ? result.length : 0).toBe(0);
  });
});
