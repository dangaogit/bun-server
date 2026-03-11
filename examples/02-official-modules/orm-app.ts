/**
 * ORM 使用示例
 *
 * 演示功能：
 * 1. Entity 和 Column 装饰器定义实体
 * 2. Repository 模式使用
 * 3. BaseRepository CRUD 操作
 * 4. 在控制器中使用 Repository
 */

import {
  Application,
  Controller,
  DatabaseModule,
  DatabaseService,
  DATABASE_SERVICE_TOKEN,
  GET,
  POST,
  PUT,
  DELETE,
  Param,
  Body,
  Query,
  HealthModule,
  Inject,
  Injectable,
  Module,
  Entity,
  Column,
  PrimaryKey,
  Repository,
  BaseRepository,
} from '@dangao/bun-server';

// 定义用户实体
@Entity('users')
class User {
  @PrimaryKey()
  @Column({ type: 'INTEGER', autoIncrement: true })
  public id!: number;

  @Column({ type: 'TEXT', nullable: false })
  public name!: string;

  @Column({ type: 'TEXT', nullable: false })
  public email!: string;

  @Column({ type: 'TEXT', nullable: true })
  public bio?: string;

  @Column({ type: 'DATETIME', defaultValue: 'CURRENT_TIMESTAMP' })
  public createdAt!: string;
}

// 定义用户 Repository
@Repository('users', 'id')
class UserRepository extends BaseRepository<User> {
  protected tableName = 'users';
  protected primaryKey = 'id';

  /**
   * 根据邮箱查找用户
   */
  public async findByEmail(email: string): Promise<User | null> {
    const sql = `SELECT * FROM ${this.tableName} WHERE email = ?`;
    const result = await this.executeQuery<User>(sql, [email]);
    return result.length > 0 ? result[0] : null;
  }

  /**
   * 搜索用户（按名称）
   */
  public async searchByName(keyword: string): Promise<User[]> {
    const sql = `SELECT * FROM ${this.tableName} WHERE name LIKE ?`;
    const result = await this.executeQuery<User>(sql, [`%${keyword}%`]);
    return result;
  }
}

// 用户服务
@Injectable()
class UserService {
  private initialized = false;

  public constructor(
    private readonly userRepository: UserRepository,
    @Inject(DATABASE_SERVICE_TOKEN)
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * 确保数据库表已初始化（懒初始化）
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // 确保数据库连接已建立
    const connection = this.databaseService.getConnection();
    if (!connection) {
      await this.databaseService.initialize();
    }

    // 创建用户表
    this.databaseService.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        bio TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.initialized = true;
  }

  /**
   * 创建用户
   */
  public async createUser(data: { name: string; email: string; bio?: string }): Promise<User> {
    await this.ensureInitialized();

    // 检查邮箱是否已存在
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new Error('Email already exists');
    }

    return await this.userRepository.create(data);
  }

  /**
   * 获取所有用户
   */
  public async getAllUsers(): Promise<User[]> {
    await this.ensureInitialized();
    return await this.userRepository.findAll();
  }

  /**
   * 根据 ID 获取用户
   */
  public async getUserById(id: number): Promise<User | null> {
    await this.ensureInitialized();
    return await this.userRepository.findById(id);
  }

  /**
   * 更新用户
   */
  public async updateUser(id: number, data: Partial<User>): Promise<User> {
    await this.ensureInitialized();
    return await this.userRepository.update(id, data);
  }

  /**
   * 删除用户
   */
  public async deleteUser(id: number): Promise<boolean> {
    await this.ensureInitialized();
    return await this.userRepository.delete(id);
  }

  /**
   * 搜索用户
   */
  public async searchUsers(keyword: string): Promise<User[]> {
    await this.ensureInitialized();
    return await this.userRepository.searchByName(keyword);
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

  @GET('/search')
  public async searchUsers(@Query('q') keyword: string) {
    if (!keyword) {
      return {
        success: false,
        error: 'Search keyword is required',
      };
    }

    const users = await this.userService.searchUsers(keyword);
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
  public async createUser(@Body() body: { name: string; email: string; bio?: string }) {
    if (!body.name || !body.email) {
      return {
        success: false,
        error: 'Name and email are required',
      };
    }

    try {
      const user = await this.userService.createUser(body);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @PUT('/:id')
  public async updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; bio?: string },
  ) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return {
        success: false,
        error: 'Invalid user ID',
      };
    }

    try {
      const user = await this.userService.updateUser(userId, body);
      return {
        success: true,
        data: user,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  @DELETE('/:id')
  public async deleteUser(@Param('id') id: string) {
    const userId = parseInt(id, 10);
    if (isNaN(userId)) {
      return {
        success: false,
        error: 'Invalid user ID',
      };
    }

    const deleted = await this.userService.deleteUser(userId);
    return {
      success: deleted,
      message: deleted ? 'User deleted successfully' : 'Failed to delete user',
    };
  }
}

// 配置数据库模块
DatabaseModule.forRoot({
  database: {
    type: 'sqlite',
    config: {
      path: './orm-demo.db',
    },
  },
  enableHealthCheck: true,
});

// 配置健康检查模块
HealthModule.forRoot({
  indicators: [],
});

// 应用模块
@Module({
  imports: [DatabaseModule, HealthModule],
  controllers: [UserController],
  providers: [UserService, UserRepository],
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
  console.log('  POST /api/users          - Create user');
  console.log('  GET  /api/users/search   - Search users');
  console.log('\n🧪 Try it with curl:');
  console.log('  # Create user');
  console.log(`  curl -X POST http://localhost:${port}/api/users \\`);
  console.log('       -H "Content-Type: application/json" \\');
  console.log('       -d \'{"name":"Alice","email":"alice@example.com","bio":"Developer"}\'');
  console.log('');
  console.log('  # Search users');
  console.log(`  curl "http://localhost:${port}/api/users/search?q=Alice"`);
});
