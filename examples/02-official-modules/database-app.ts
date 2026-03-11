/**
 * 数据库模块使用示例
 *
 * 演示功能：
 * 1. DatabaseModule 配置和使用
 * 2. SQLite 数据库连接和查询
 * 3. 数据库健康检查集成
 * 4. 在控制器中使用数据库服务
 */

import {
  Application,
  Controller,
  DatabaseModule,
  DatabaseService,
  DATABASE_SERVICE_TOKEN,
  GET,
  POST,
  Param,
  Body,
  HealthModule,
  Inject,
  Injectable,
  Module,
} from '@dangao/bun-server';

// 配置数据库模块
DatabaseModule.forRoot({
  database: {
    type: 'sqlite',
    config: {
      path: './data.db', // 使用文件数据库，也可以使用 ':memory:' 作为内存数据库
    },
  },
  pool: {
    maxConnections: 10,
    connectionTimeout: 30000,
    retryCount: 3,
    retryDelay: 1000,
  },
  enableHealthCheck: true, // 启用健康检查
});

// 配置健康检查模块（包含数据库健康检查）
HealthModule.forRoot({
  indicators: [],
});

// 用户服务
@Injectable()
class UserService {
  private initialized = false;

  public constructor(
    @Inject(DATABASE_SERVICE_TOKEN)
    private readonly database: DatabaseService,
  ) {}

  /**
   * 确保数据库表已初始化（懒初始化）
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // 确保数据库连接已建立
    // 注意：由于 DatabaseExtension 的初始化可能在模块注册时未完成，
    // 我们在这里检查并手动初始化连接
    const connection = this.database.getConnection();
    if (!connection) {
      await this.database.initialize();
    }

    // 创建用户表
    this.database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.initialized = true;
  }

  /**
   * 创建用户
   */
  public async createUser(name: string, email: string): Promise<number> {
    await this.ensureInitialized();
    this.database.query('INSERT INTO users (name, email) VALUES (?, ?)', [
      name,
      email,
    ]);

    // 获取最后插入的 ID
    const result = this.database.query<{ id: number }>(
      'SELECT last_insert_rowid() as id',
    );
    return result[0]?.id ?? 0;
  }

  /**
   * 获取所有用户
   */
  public async getAllUsers(): Promise<
    Array<{ id: number; name: string; email: string; created_at: string }>
  > {
    await this.ensureInitialized();
    return this.database.query(
      'SELECT id, name, email, created_at FROM users ORDER BY id',
    );
  }

  /**
   * 根据 ID 获取用户
   */
  public async getUserById(id: number): Promise<{
    id: number;
    name: string;
    email: string;
    created_at: string;
  } | null> {
    await this.ensureInitialized();
    const result = this.database.query<{
      id: number;
      name: string;
      email: string;
      created_at: string;
    }>('SELECT id, name, email, created_at FROM users WHERE id = ?', [id]);

    return result[0] ?? null;
  }

  /**
   * 根据邮箱获取用户
   */
  public async getUserByEmail(email: string): Promise<{
    id: number;
    name: string;
    email: string;
    created_at: string;
  } | null> {
    await this.ensureInitialized();
    const result = this.database.query<{
      id: number;
      name: string;
      email: string;
      created_at: string;
    }>('SELECT id, name, email, created_at FROM users WHERE email = ?', [
      email,
    ]);

    return result[0] ?? null;
  }
}

// 用户控制器
@Controller('/api/users')
class UserController {
  public constructor(private readonly userService: UserService) {}

  @GET('/')
  public async getAllUsers() {
    const users = await this.userService.getAllUsers();
    return {
      success: true,
      data: users,
      count: users.length,
    };
  }

  @GET('/:id')
  public async getUser(@Param('id') id: string) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return {
        success: false,
        error: 'Invalid user ID',
      };
    }

    const user = await this.userService.getUserById(userId);
    if (!user) {
      return {
        success: false,
        error: 'User not found',
      };
    }

    return {
      success: true,
      data: user,
    };
  }

  @POST('/')
  public async createUser(@Body() body: { name: string; email: string }) {
    if (!body.name || !body.email) {
      return {
        success: false,
        error: 'Name and email are required',
      };
    }

    // 检查邮箱是否已存在
    const existingUser = await this.userService.getUserByEmail(body.email);
    if (existingUser) {
      return {
        success: false,
        error: 'Email already exists',
      };
    }

    const id = await this.userService.createUser(body.name, body.email);
    return {
      success: true,
      data: {
        id,
        name: body.name,
        email: body.email,
      },
    };
  }
}

// 应用模块
@Module({
  imports: [DatabaseModule, HealthModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService], // 导出 UserService 以便在应用启动时访问
})
class AppModule {}

// 创建应用
const port = Number(process.env.PORT ?? 3000);
const app = new Application({
  port,
});

// 注册模块
app.registerModule(AppModule);

// 启动应用
app.listen().then(() => {
  console.log(`🚀 Server started on http://localhost:${port}`);
  console.log(`📊 Health check: http://localhost:${port}/health`);
  console.log('\n📝 Available endpoints:');
  console.log('  GET  /api/users     - Get all users');
  console.log('  GET  /api/users/:id - Get user by ID');
  console.log('  POST /api/users     - Create user');
  console.log('\n🧪 Try it with curl:');
  console.log('  # Get all users');
  console.log(`  curl http://localhost:${port}/api/users`);
  console.log('');
  console.log('  # Get user by ID');
  console.log(`  curl http://localhost:${port}/api/users/1`);
  console.log('');
  console.log('  # Create user');
  console.log(`  curl -X POST http://localhost:${port}/api/users \\`);
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"name":"Alice","email":"alice@example.com"}\'');
});
