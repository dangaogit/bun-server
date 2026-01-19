import {
  Application,
  Body,
  Cacheable,
  CacheEvict,
  CachePut,
  CACHE_SERVICE_TOKEN,
  CacheModule,
  CacheService,
  ConfigModule,
  Controller,
  GET,
  Inject,
  Injectable,
  LoggerModule,
  LogLevel,
  Module,
  POST,
  PUT,
  DELETE,
  Param,
} from '@dangao/bun-server';

/**
 * 用户服务 - 演示缓存装饰器的使用
 */
@Injectable()
class UserService {
  private readonly users = new Map<string, { id: string; name: string; email: string }>([
    ['1', { id: '1', name: 'Alice', email: 'alice@example.com' }],
    ['2', { id: '2', name: 'Bob', email: 'bob@example.com' }],
  ]);

  /**
   * 使用 @Cacheable 装饰器缓存方法结果
   * 当方法被调用时，会先检查缓存，如果缓存存在则直接返回，否则执行方法并缓存结果
   */
  @Cacheable({ key: 'user:{id}', ttl: 60000 }) // 缓存 60 秒
  public async findUser(id: string): Promise<{ id: string; name: string; email: string } | undefined> {
    console.log(`[UserService] Fetching user ${id} from database...`);
    // 模拟数据库查询延迟
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.users.get(id);
  }

  /**
   * 使用 @CacheEvict 装饰器清除缓存
   * 当方法执行后，会清除指定的缓存
   */
  @CacheEvict({ key: 'user:{id}' })
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
   * 使用 @CachePut 装饰器更新缓存
   * 当方法执行后，会将结果更新到缓存中
   */
  @CachePut({ key: 'user:{id}', ttl: 60000 })
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
   * 清除所有用户缓存
   */
  @CacheEvict({ allEntries: true, keyPrefix: 'user:' })
  public async deleteUser(id: string): Promise<boolean> {
    console.log(`[UserService] Deleting user ${id}...`);
    return this.users.delete(id);
  }
}

/**
 * 产品服务 - 演示直接使用 CacheService
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

@Module({
  controllers: [UserController, ProductController],
  providers: [UserService, ProductService],
  exports: [UserService, ProductService],
})
class AppModule {}

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
console.log(`  GET  /api/users/:id          - Get user (cached)`);
console.log(`  POST /api/users               - Create user (updates cache)`);
console.log(`  PUT  /api/users/:id           - Update user (evicts cache)`);
console.log(`  DELETE /api/users/:id         - Delete user (evicts cache)`);
console.log(`  GET  /api/products/:id        - Get product (manual cache)`);
console.log(`  GET  /api/products/:id/cached - Get product (getOrSet)`);
console.log(`  DELETE /api/products/:id/cache - Clear product cache`);
