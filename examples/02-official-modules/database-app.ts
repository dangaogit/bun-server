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
  public constructor(
    @Inject(DATABASE_SERVICE_TOKEN)
    private readonly database: DatabaseService,
  ) {}

  /**
   * 初始化数据库表
   */
  public async initialize(): Promise<void> {
    // 创建用户表
    this.database.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * 创建用户
   */
  public async createUser(name: string, email: string): Promise<number> {
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
  controllers: [UserController],
  providers: [UserService],
})
class AppModule {}

// 创建应用
const app = new Application({
  port: 3000,
});

// 注册模块
app.registerModule(DatabaseModule);
app.registerModule(HealthModule);
app.registerModule(AppModule);

// 启动应用并初始化数据库
(async () => {
  await app.listen();
  
  // 初始化数据库表
  const userService = app.getContainer().resolve<UserService>(UserService);
  await userService.initialize();
  
  console.log('🚀 Server started on http://localhost:3000');
  console.log('📊 Health check: http://localhost:3000/health');
  console.log('👥 Users API: http://localhost:3000/api/users');
  console.log('\n示例请求:');
  console.log('  POST http://localhost:3000/api/users');
  console.log('  Body: { "name": "Alice", "email": "alice@example.com" }');
})();
