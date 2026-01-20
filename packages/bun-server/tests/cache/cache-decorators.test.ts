import 'reflect-metadata';
import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { Controller } from '../../src/controller/controller';
import { GET } from '../../src/router/decorators';
import { Param } from '../../src/controller/decorators';
import { Module } from '../../src/di/module';
import { Injectable, Inject } from '../../src/di/decorators';
import {
  CacheModule,
  CacheService,
  Cacheable,
  CacheEvict,
  CachePut,
  EnableCacheProxy,
  CACHE_SERVICE_TOKEN,
} from '../../src/cache';
import { RouteRegistry } from '../../src/router/registry';
import { ControllerRegistry } from '../../src/controller/controller';
import { ModuleRegistry } from '../../src/di/module-registry';
import { getTestPort } from '../utils/test-port';

describe('Cache Decorators', () => {
  let app: Application;
  let port: number;
  let callCount: number;

  beforeEach(() => {
    port = getTestPort();
    callCount = 0;
    CacheModule.reset();
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
    ModuleRegistry.getInstance().clear();
  });

  test('@Cacheable should cache method results in service layer', async () => {
    // 定义服务
    @Injectable()
    @EnableCacheProxy()
    class UserService {
      @Cacheable({ key: 'user:{0}', ttl: 5000 })
      public async findById(id: string): Promise<{ id: string; name: string }> {
        callCount++;
        return { id, name: `User ${id}` };
      }
    }

    // 定义控制器
    @Controller('/api/users')
    class UserController {
      public constructor(private readonly userService: UserService) {}

      @GET('/:id')
      public async getUser(@Param('id') id: string): Promise<{ id: string; name: string }> {
        return await this.userService.findById(id);
      }
    }

    // 定义模块
    @Module({
      imports: [CacheModule.forRoot({ defaultTtl: 5000 })],
      controllers: [UserController],
      providers: [UserService],
    })
    class AppModule {}

    // 创建应用
    app = new Application({ port });
    app.registerModule(AppModule);
    await app.listen();

    // 第一次调用 - 应该执行方法
    const response1 = await fetch(`http://localhost:${port}/api/users/1`);
    expect(response1.status).toBe(200);
    const data1 = await response1.json();
    expect(data1.id).toBe('1');
    expect(data1.name).toBe('User 1');
    expect(callCount).toBe(1);

    // 第二次调用 - 应该使用缓存
    const response2 = await fetch(`http://localhost:${port}/api/users/1`);
    expect(response2.status).toBe(200);
    const data2 = await response2.json();
    expect(data2.id).toBe('1');
    expect(data2.name).toBe('User 1');
    expect(callCount).toBe(1); // 方法没有被再次调用

    // 调用不同的 ID - 应该执行方法
    const response3 = await fetch(`http://localhost:${port}/api/users/2`);
    expect(response3.status).toBe(200);
    const data3 = await response3.json();
    expect(data3.id).toBe('2');
    expect(data3.name).toBe('User 2');
    expect(callCount).toBe(2);
  });

  test('@CacheEvict should clear cache', async () => {
    // 定义服务
    @Injectable()
    @EnableCacheProxy()
    class ProductService {
      @Cacheable({ key: 'product:{0}', ttl: 5000 })
      public async findById(id: string): Promise<{ id: string; name: string }> {
        callCount++;
        return { id, name: `Product ${id} v${callCount}` };
      }

      @CacheEvict({ key: 'product:{0}' })
      public async deleteById(id: string): Promise<void> {
        // 删除产品
      }
    }

    // 定义控制器
    @Controller('/api/products')
    class ProductController {
      public constructor(private readonly productService: ProductService) {}

      @GET('/:id')
      public async getProduct(@Param('id') id: string): Promise<{ id: string; name: string }> {
        return await this.productService.findById(id);
      }

      @GET('/:id/delete')
      public async deleteProduct(@Param('id') id: string): Promise<{ success: boolean }> {
        await this.productService.deleteById(id);
        return { success: true };
      }
    }

    // 定义模块
    @Module({
      imports: [CacheModule.forRoot({ defaultTtl: 5000 })],
      controllers: [ProductController],
      providers: [ProductService],
    })
    class AppModule {}

    // 创建应用
    app = new Application({ port });
    app.registerModule(AppModule);
    await app.listen();

    // 第一次调用 - 缓存产品
    const response1 = await fetch(`http://localhost:${port}/api/products/1`);
    expect(response1.status).toBe(200);
    const data1 = await response1.json();
    expect(data1.name).toBe('Product 1 v1');
    expect(callCount).toBe(1);

    // 第二次调用 - 使用缓存
    const response2 = await fetch(`http://localhost:${port}/api/products/1`);
    const data2 = await response2.json();
    expect(data2.name).toBe('Product 1 v1');
    expect(callCount).toBe(1);

    // 删除产品 - 清除缓存
    await fetch(`http://localhost:${port}/api/products/1/delete`);

    // 再次获取 - 缓存已清除，应重新执行方法
    const response3 = await fetch(`http://localhost:${port}/api/products/1`);
    const data3 = await response3.json();
    expect(data3.name).toBe('Product 1 v2');
    expect(callCount).toBe(2);
  });

  test('@CachePut should always execute method and update cache', async () => {
    // 定义服务
    @Injectable()
    @EnableCacheProxy()
    class OrderService {
      @Cacheable({ key: 'order:{0}', ttl: 5000 })
      public async findById(id: string): Promise<{ id: string; status: string }> {
        callCount++;
        return { id, status: 'pending' };
      }

      @CachePut({ key: 'order:{0}', ttl: 5000 })
      public async updateStatus(id: string, status: string): Promise<{ id: string; status: string }> {
        return { id, status };
      }
    }

    // 定义控制器
    @Controller('/api/orders')
    class OrderController {
      public constructor(private readonly orderService: OrderService) {}

      @GET('/:id')
      public async getOrder(@Param('id') id: string): Promise<{ id: string; status: string }> {
        return await this.orderService.findById(id);
      }

      @GET('/:id/update/:status')
      public async updateOrder(
        @Param('id') id: string,
        @Param('status') status: string,
      ): Promise<{ id: string; status: string }> {
        return await this.orderService.updateStatus(id, status);
      }
    }

    // 定义模块
    @Module({
      imports: [CacheModule.forRoot({ defaultTtl: 5000 })],
      controllers: [OrderController],
      providers: [OrderService],
    })
    class AppModule {}

    // 创建应用
    app = new Application({ port });
    app.registerModule(AppModule);
    await app.listen();

    // 第一次调用 - 缓存订单
    const response1 = await fetch(`http://localhost:${port}/api/orders/1`);
    expect(response1.status).toBe(200);
    const data1 = await response1.json();
    expect(data1.status).toBe('pending');
    expect(callCount).toBe(1);

    // 更新订单状态 - @CachePut 会更新缓存
    const response2 = await fetch(`http://localhost:${port}/api/orders/1/update/completed`);
    const data2 = await response2.json();
    expect(data2.status).toBe('completed');

    // 再次获取 - 应该返回更新后的缓存
    const response3 = await fetch(`http://localhost:${port}/api/orders/1`);
    const data3 = await response3.json();
    expect(data3.status).toBe('completed');
    expect(callCount).toBe(1); // findById 没有被再次调用
  });

  test('Service without @EnableCacheProxy should not use cache', async () => {
    // 定义服务（没有 @EnableCacheProxy）
    @Injectable()
    class NoCacheService {
      @Cacheable({ key: 'nocache:{0}', ttl: 5000 })
      public async findById(id: string): Promise<{ id: string }> {
        callCount++;
        return { id };
      }
    }

    // 定义控制器
    @Controller('/api/nocache')
    class NoCacheController {
      public constructor(private readonly noCacheService: NoCacheService) {}

      @GET('/:id')
      public async get(@Param('id') id: string): Promise<{ id: string }> {
        return await this.noCacheService.findById(id);
      }
    }

    // 定义模块
    @Module({
      imports: [CacheModule.forRoot({ defaultTtl: 5000 })],
      controllers: [NoCacheController],
      providers: [NoCacheService],
    })
    class AppModule {}

    // 创建应用
    app = new Application({ port });
    app.registerModule(AppModule);
    await app.listen();

    // 两次调用都应该执行方法（没有缓存）
    await fetch(`http://localhost:${port}/api/nocache/1`);
    expect(callCount).toBe(1);

    await fetch(`http://localhost:${port}/api/nocache/1`);
    expect(callCount).toBe(2); // 方法被再次调用
  });
});
