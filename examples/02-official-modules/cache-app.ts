/**
 * Cache Module Example - 缓存模块示例
 *
 * 演示功能：
 * 1. @Cacheable 装饰器 - 自动缓存方法结果
 * 2. @CacheEvict 装饰器 - 自动清除缓存
 * 3. @CachePut 装饰器 - 执行方法并更新缓存
 * 4. CacheService 手动缓存 - 更细粒度的控制
 *
 * ⚠️ 重要：使用缓存装饰器的服务类必须添加 @EnableCacheProxy() 装饰器
 *
 * 运行方式：
 *   bun run examples/02-official-modules/cache-app.ts
 *
 * 测试装饰器缓存：
 *   # 1. 第一次请求（缓存未命中，会打印 "Fetching from database..."）
 *   curl http://localhost:3200/api/users/1
 *
 *   # 2. 第二次请求（缓存命中，不会打印日志）
 *   curl http://localhost:3200/api/users/1
 *
 *   # 3. 更新用户（@CacheEvict 清除缓存）
 *   curl -X PUT http://localhost:3200/api/users/1 \
 *     -H "Content-Type: application/json" \
 *     -d '{"name":"Alice Updated","email":"alice@example.com"}'
 *
 *   # 4. 再次请求（缓存已清除，会重新查询）
 *   curl http://localhost:3200/api/users/1
 *
 * 测试手动缓存：
 *   curl http://localhost:3200/api/products/123
 *   curl http://localhost:3200/api/products/123  # 第二次应该命中缓存
 */

import {
  Application,
  Body,
  CACHE_SERVICE_TOKEN,
  Cacheable,
  CacheEvict,
  CacheModule,
  CachePut,
  CacheService,
  ConfigModule,
  Controller,
  DELETE,
  EnableCacheProxy,
  GET,
  Inject,
  Injectable,
  LoggerModule,
  LogLevel,
  Module,
  Param,
  POST,
  PUT,
} from '@dangao/bun-server';

/**
 * 用户服务 - 演示使用缓存装饰器
 *
 * @EnableCacheProxy() 装饰器是必须的，它告诉框架为这个服务创建缓存代理
 */
@Injectable()
@EnableCacheProxy()
class UserService {
  private readonly users = new Map<string, { id: string; name: string; email: string }>([
    ['1', { id: '1', name: 'Alice', email: 'alice@example.com' }],
    ['2', { id: '2', name: 'Bob', email: 'bob@example.com' }],
  ]);

  /**
   * 查找用户（使用 @Cacheable 自动缓存）
   *
   * @Cacheable 装饰器会：
   * - 第一次调用：执行方法，缓存结果
   * - 后续调用：直接返回缓存结果（不执行方法）
   *
   * key: 缓存键，支持 {0}, {1} 等参数占位符
   * ttl: 过期时间（毫秒）
   */
  @Cacheable({ key: 'user:{0}', ttl: 60000 })
  public async findUser(id: string): Promise<{ id: string; name: string; email: string } | undefined> {
    console.log(`[UserService] Fetching user ${id} from database...`);
    // 模拟数据库查询延迟
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.users.get(id);
  }

  /**
   * 更新用户（使用 @CacheEvict 清除缓存）
   *
   * @CacheEvict 装饰器会：
   * - 默认：先执行方法，再清除缓存
   * - beforeInvocation: true 时，先清除缓存，再执行方法
   */
  @CacheEvict({ key: 'user:{0}' })
  public async updateUser(
    id: string,
    name: string,
    email: string,
  ): Promise<{ id: string; name: string; email: string }> {
    console.log(`[UserService] Updating user ${id}...`);
    const user = { id, name, email };
    this.users.set(id, user);
    return user;
  }

  /**
   * 创建用户（使用 @CachePut 更新缓存）
   *
   * @CachePut 装饰器会：
   * - 总是执行方法
   * - 用方法结果更新缓存
   */
  @CachePut({ key: 'user:{0}', ttl: 60000 })
  public async createUser(
    name: string,
    email: string,
  ): Promise<{ id: string; name: string; email: string }> {
    console.log(`[UserService] Creating new user...`);
    const id = String(this.users.size + 1);
    const user = { id, name, email };
    this.users.set(id, user);
    return user;
  }

  /**
   * 删除用户（清除单个用户缓存）
   */
  @CacheEvict({ key: 'user:{0}' })
  public async deleteUser(id: string): Promise<boolean> {
    console.log(`[UserService] Deleting user ${id}...`);
    return this.users.delete(id);
  }
}

/**
 * 产品服务 - 演示使用 CacheService 手动缓存
 *
 * 手动缓存适用于需要更细粒度控制的场景
 */
@Injectable()
class ProductService {
  public constructor(
    @Inject(CACHE_SERVICE_TOKEN) private readonly cache: CacheService,
  ) {}

  public async getProduct(id: string): Promise<{ id: string; name: string; price: number } | null> {
    // 先检查缓存
    const cached = await this.cache.get<{ id: string; name: string; price: number }>(`product:${id}`);
    if (cached) {
      console.log(`[ProductService] Cache hit for product ${id}`);
      return cached;
    }

    console.log(`[ProductService] Cache miss for product ${id}, fetching from database...`);
    // 模拟数据库查询
    await new Promise((resolve) => setTimeout(resolve, 200));
    const product = { id, name: `Product ${id}`, price: Math.random() * 100 };

    // 缓存结果
    await this.cache.set(`product:${id}`, product, 30000); // 缓存 30 秒
    return product;
  }

  public async getOrSetProduct(id: string): Promise<{ id: string; name: string; price: number }> {
    // 使用 getOrSet 方法，如果缓存不存在则执行工厂函数并缓存结果
    return await this.cache.getOrSet(
      `product:${id}`,
      async () => {
        console.log(`[ProductService] Factory function called for product ${id}`);
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { id, name: `Product ${id}`, price: Math.random() * 100 };
      },
      30000, // TTL: 30 秒
    );
  }

  public async clearProductCache(id: string): Promise<void> {
    await this.cache.delete(`product:${id}`);
    console.log(`[ProductService] Cache cleared for product ${id}`);
  }
}

@Controller('/api/users')
class UserController {
  public constructor(
    @Inject(UserService) private readonly userService: UserService,
  ) {}

  @GET('/:id')
  public async getUser(@Param('id') id: string) {
    const user = await this.userService.findUser(id);
    if (!user) {
      return { error: 'User not found' };
    }
    return user;
  }

  @POST('/')
  public async createUser(@Body() body: { name: string; email: string }) {
    return await this.userService.createUser(body.name, body.email);
  }

  @PUT('/:id')
  public async updateUser(
    @Param('id') id: string,
    @Body() body: { name: string; email: string },
  ) {
    return await this.userService.updateUser(id, body.name, body.email);
  }

  @DELETE('/:id')
  public async deleteUser(@Param('id') id: string) {
    const deleted = await this.userService.deleteUser(id);
    return { deleted };
  }
}

@Controller('/api/products')
class ProductController {
  public constructor(
    @Inject(ProductService) private readonly productService: ProductService,
  ) {}

  @GET('/:id')
  public async getProduct(@Param('id') id: string) {
    const product = await this.productService.getProduct(id);
    if (!product) {
      return { error: 'Product not found' };
    }
    return product;
  }

  @GET('/:id/cached')
  public async getCachedProduct(@Param('id') id: string) {
    return await this.productService.getOrSetProduct(id);
  }

  @DELETE('/:id/cache')
  public async clearCache(@Param('id') id: string) {
    await this.productService.clearProductCache(id);
    return { message: 'Cache cleared' };
  }
}

const port = Number(process.env.PORT ?? 3200);

// 配置 ConfigModule
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: 'Cache Example App',
      port,
    },
  },
});

// 配置 Logger 模块
LoggerModule.forRoot({
  logger: {
    prefix: 'CacheExample',
    level: LogLevel.INFO,
  },
  enableRequestLogging: true,
});

// 配置 Cache 模块
CacheModule.forRoot({
  defaultTtl: 60000, // 默认 TTL: 60 秒
  keyPrefix: 'app:', // 键前缀
});

// 应用模块
@Module({
  imports: [ConfigModule, LoggerModule, CacheModule],
  controllers: [UserController, ProductController],
  providers: [UserService, ProductService],
})
class RootModule {}

const app = new Application({ port });
app.registerModule(RootModule);
app.listen(port);

console.log(`🚀 Cache Example Server running on http://localhost:${port}`);
console.log(`\n📝 Example endpoints:`);
console.log(`  GET  /api/users/:id          - Get user (@Cacheable decorator)`);
console.log(`  POST /api/users               - Create user (@CachePut decorator)`);
console.log(`  PUT  /api/users/:id           - Update user (@CacheEvict decorator)`);
console.log(`  DELETE /api/users/:id         - Delete user (@CacheEvict decorator)`);
console.log(`  GET  /api/products/:id        - Get product (manual cache)`);
console.log(`  GET  /api/products/:id/cached - Get product (CacheService.getOrSet)`);
console.log(`  DELETE /api/products/:id/cache - Clear product cache`);

console.log(`\n🧪 Try it with curl:`);
console.log(`  # 1. First request (cache miss, see "Fetching from database...")`);
console.log(`  curl http://localhost:${port}/api/users/1`);
console.log(``);
console.log(`  # 2. Second request (cache hit, no "Fetching..." log)`);
console.log(`  curl http://localhost:${port}/api/users/1`);
console.log(``);
console.log(`  # 3. Update user (@CacheEvict clears cache)`);
console.log(`  curl -X PUT http://localhost:${port}/api/users/1 \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"name":"Alice Updated","email":"alice@example.com"}'`);
console.log(``);
console.log(`  # 4. Request again (cache miss after eviction)`);
console.log(`  curl http://localhost:${port}/api/users/1`);

console.log(`\n💡 Watch the console for cache behavior:`);
console.log(`  - "Fetching from database..." = cache miss (method executed)`);
console.log(`  - No log = cache hit (method NOT executed)`);
console.log(`  - "Updating user..." = @CacheEvict (cache cleared after)`);
