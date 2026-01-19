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
  public constructor(
    private readonly userRepository: UserRepository,
    @Inject(DATABASE_SERVICE_TOKEN)
    private readonly databaseService: DatabaseService,
  ) {}

  /**
   * 初始化数据库表
   */
  public async initialize(): Promise<void> {
    // 直接使用注入的 DatabaseService，避免访问 Repository 的私有属性
    this.databaseService.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        bio TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * 创建用户
   */
  public async createUser(data: { name: string; email: string; bio?: string }): Promise<User> {
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
    return await this.userRepository.findAll();
  }

  /**
   * 根据 ID 获取用户
   */
  public async getUserById(id: number): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  /**
   * 更新用户
   */
  public async updateUser(id: number, data: Partial<User>): Promise<User> {
    return await this.userRepository.update(id, data);
  }

  /**
   * 删除用户
   */
  public async deleteUser(id: number): Promise<boolean> {
    return await this.userRepository.delete(id);
  }

  /**
   * 搜索用户
   */
  public async searchUsers(keyword: string): Promise<User[]> {
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

// 应用模块
@Module({
  controllers: [UserController],
  providers: [UserService, UserRepository],
})
class AppModule {}

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
  const container = app.getContainer();
  const userService = container.resolve<UserService>(UserService);
  await userService.initialize();

  console.log('🚀 Server started on http://localhost:3000');
  console.log('📊 Health check: http://localhost:3000/health');
  console.log('👥 Users API: http://localhost:3000/api/users');
  console.log('\n示例请求:');
  console.log('  POST http://localhost:3000/api/users');
  console.log('  Body: { "name": "Alice", "email": "alice@example.com", "bio": "Developer" }');
  console.log('  GET  http://localhost:3000/api/users/search?q=Alice');
})();
