/**
 * Dependency Injection - 依赖注入基础
 * 
 * 演示如何使用依赖注入：
 * 1. 定义服务（@Injectable）
 * 2. 在控制器中注入服务（构造函数注入）
 * 3. 注册服务到容器
 * 
 * 运行方式：
 *   bun run examples/00-quick-start/03-dependency-injection.ts
 * 
 * 测试：
 *   curl http://localhost:3100/api/users
 *   curl http://localhost:3100/api/users/1
 */

import { Application, Controller, GET, Param, Injectable } from '@dangao/bun-server';

// 1. 定义数据模型
interface User {
  id: string;
  name: string;
  email: string;
}

// 2. 定义服务：使用 @Injectable() 装饰器标记为可注入
@Injectable()
class UserService {
  private readonly users = new Map<string, User>([
    ['1', { id: '1', name: 'Alice', email: 'alice@example.com' }],
    ['2', { id: '2', name: 'Bob', email: 'bob@example.com' }],
  ]);

  /**
   * 查找所有用户
   */
  public findAll(): User[] {
    return Array.from(this.users.values());
  }

  /**
   * 根据 ID 查找用户
   */
  public findById(id: string): User | undefined {
    return this.users.get(id);
  }
}

// 3. 定义控制器：在构造函数中注入服务
@Controller('/api/users')
class UserController {
  // 构造函数注入：框架会自动解析 UserService 类型并注入实例
  // 注意：不需要 @Inject 装饰器，框架会自动识别
  public constructor(
    private readonly userService: UserService,
  ) {}

  @GET('/')
  public getAllUsers() {
    const users = this.userService.findAll();
    return {
      count: users.length,
      users,
    };
  }

  @GET('/:id')
  public getUser(@Param('id') id: string) {
    const user = this.userService.findById(id);
    if (!user) {
      return { error: 'User not found' };
    }
    return user;
  }
}

// 4. 创建应用并注册
const port = Number(process.env.PORT ?? 3100);
const app = new Application({ port });

// 注册服务到容器（必须在注册控制器之前）
app.getContainer().register(UserService);

// 注册控制器
app.registerController(UserController);

// 启动服务器
app.listen();

console.log(`🚀 Server running on http://localhost:${port}`);
console.log('\n📝 Available endpoints:');
console.log('  GET /api/users     - Get all users');
console.log('  GET /api/users/:id - Get user by ID');
console.log('\n🧪 Try it with curl:');
console.log(`  curl http://localhost:${port}/api/users`);
console.log(`  curl http://localhost:${port}/api/users/1`);
console.log('\n💡 Key concepts:');
console.log('  - @Injectable() marks a class as injectable');
console.log('  - Constructor injection auto-resolves dependencies');
console.log('  - Container manages service lifecycle');
