/**
 * 事务使用示例
 *
 * 演示功能：
 * 1. @Transactional() 装饰器使用
 * 2. 事务传播行为（REQUIRED, REQUIRES_NEW, NESTED）
 * 3. 嵌套事务和保存点
 * 4. 事务回滚
 */

import {
  Application,
  Controller,
  DatabaseModule,
  DatabaseService,
  GET,
  POST,
  Param,
  Body,
  Injectable,
  Module,
  Transactional,
  Propagation,
  IsolationLevel,
  BaseRepository,
  Repository,
} from '@dangao/bun-server';

// 账户实体
interface Account {
  id?: number;
  name: string;
  balance: number;
}

// 账户 Repository
@Repository('accounts', 'id')
class AccountRepository extends BaseRepository<Account> {
  protected tableName = 'accounts';
  protected primaryKey = 'id';

  /**
   * 转账
   */
  public async transfer(fromId: number, toId: number, amount: number): Promise<void> {
    const db = this['databaseService'] as DatabaseService;

    // 扣除转出账户余额
    await db.query('UPDATE accounts SET balance = balance - ? WHERE id = ?', [amount, fromId]);

    // 增加转入账户余额
    await db.query('UPDATE accounts SET balance = balance + ? WHERE id = ?', [amount, toId]);
  }
}

// 账户服务
@Injectable()
class AccountService {
  private initialized = false;

  public constructor(private readonly accountRepository: AccountRepository) {}

  /**
   * 确保数据库表已初始化（懒初始化）
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const db = this.accountRepository['databaseService'] as DatabaseService;

    // 确保数据库连接已建立
    const connection = db.getConnection();
    if (!connection) {
      await db.initialize();
    }

    // 创建账户表
    db.query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        balance REAL NOT NULL DEFAULT 0
      )
    `);
    this.initialized = true;
  }

  /**
   * 创建账户（使用事务）
   */
  @Transactional()
  public async createAccount(name: string, initialBalance: number): Promise<Account> {
    await this.ensureInitialized();
    return await this.accountRepository.create({ name, balance: initialBalance });
  }

  /**
   * 转账（使用事务，确保原子性）
   */
  @Transactional()
  public async transferMoney(
    fromId: number,
    toId: number,
    amount: number,
  ): Promise<void> {
    await this.ensureInitialized();
    const fromAccount = await this.accountRepository.findById(fromId);
    const toAccount = await this.accountRepository.findById(toId);

    if (!fromAccount || !toAccount) {
      throw new Error('Account not found');
    }

    if (fromAccount.balance < amount) {
      throw new Error('Insufficient balance');
    }

    await this.accountRepository.transfer(fromId, toId, amount);
  }

  /**
   * 批量转账（使用嵌套事务）
   */
  @Transactional({ propagation: Propagation.REQUIRED })
  public async batchTransfer(
    transfers: Array<{ fromId: number; toId: number; amount: number }>,
  ): Promise<void> {
    await this.ensureInitialized();
    for (const transfer of transfers) {
      // 每个转账都在嵌套事务中执行
      await this.transferMoneyInNestedTransaction(
        transfer.fromId,
        transfer.toId,
        transfer.amount,
      );
    }
  }

  /**
   * 嵌套事务转账（如果失败，只回滚当前转账，不影响其他转账）
   */
  @Transactional({ propagation: Propagation.NESTED })
  private async transferMoneyInNestedTransaction(
    fromId: number,
    toId: number,
    amount: number,
  ): Promise<void> {
    await this.transferMoney(fromId, toId, amount);
  }

  /**
   * 使用新事务创建账户（即使外层有事务，也创建新事务）
   */
  @Transactional({ propagation: Propagation.REQUIRES_NEW })
  public async createAccountInNewTransaction(
    name: string,
    initialBalance: number,
  ): Promise<Account> {
    await this.ensureInitialized();
    return await this.accountRepository.create({ name, balance: initialBalance });
  }

  /**
   * 只读事务
   */
  @Transactional({ readOnly: true })
  public async getAccountBalance(id: number): Promise<number> {
    await this.ensureInitialized();
    const account = await this.accountRepository.findById(id);
    return account?.balance ?? 0;
  }

  /**
   * 指定隔离级别的事务
   */
  @Transactional({ isolationLevel: IsolationLevel.READ_COMMITTED })
  public async updateAccountWithIsolation(id: number, balance: number): Promise<Account> {
    await this.ensureInitialized();
    return await this.accountRepository.update(id, { balance });
  }
}

// 账户控制器
@Controller('/api/accounts')
class AccountController {
  public constructor(private readonly accountService: AccountService) {}

  @POST('/')
  public async createAccount(@Body() body: { name: string; balance: number }) {
    try {
      const account = await this.accountService.createAccount(body.name, body.balance);
      return {
        success: true,
        data: account,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @POST('/transfer')
  public async transfer(
    @Body() body: { fromId: number; toId: number; amount: number },
  ) {
    try {
      await this.accountService.transferMoney(body.fromId, body.toId, body.amount);
      return {
        success: true,
        message: 'Transfer completed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @POST('/batch-transfer')
  public async batchTransfer(
    @Body() body: { transfers: Array<{ fromId: number; toId: number; amount: number }> },
  ) {
    try {
      await this.accountService.batchTransfer(body.transfers);
      return {
        success: true,
        message: 'Batch transfer completed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @GET('/:id/balance')
  public async getBalance(@Param('id') id: string) {
    try {
      const balance = await this.accountService.getAccountBalance(parseInt(id, 10));
      return {
        success: true,
        balance,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

// 配置数据库模块
DatabaseModule.forRoot({
  database: {
    type: 'sqlite',
    config: {
      path: './transaction-demo.db',
    },
  },
  enableHealthCheck: true,
});

// 应用模块
@Module({
  imports: [DatabaseModule],
  controllers: [AccountController],
  providers: [AccountService, AccountRepository],
})
class AppModule {}

// 创建应用
const app = new Application({
  port: 3000,
});

// 注册模块
app.registerModule(AppModule);

// 启动应用
app.listen().then(() => {
  console.log('🚀 Server started on http://localhost:3000');
  console.log('\n📝 Available endpoints:');
  console.log('  POST /api/accounts          - Create account');
  console.log('  POST /api/accounts/transfer - Transfer money');
  console.log('  GET  /api/accounts/:id/balance - Get account balance');
  console.log('\n🧪 Try it with curl:');
  console.log('  # 1. Create account (Alice)');
  console.log('  curl -X POST http://localhost:3000/api/accounts \\');
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"name":"Alice","balance":1000}\'');
  console.log('');
  console.log('  # 2. Create account (Bob)');
  console.log('  curl -X POST http://localhost:3000/api/accounts \\');
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"name":"Bob","balance":500}\'');
  console.log('');
  console.log('  # 3. Transfer money');
  console.log('  curl -X POST http://localhost:3000/api/accounts/transfer \\');
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"fromId":1,"toId":2,"amount":100}\'');
  console.log('');
  console.log('  # 4. Check balance');
  console.log('  curl http://localhost:3000/api/accounts/1/balance');
});
