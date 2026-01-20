import 'reflect-metadata';
import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { GET, POST } from '../../src/router/decorators';
import { Param } from '../../src/controller/decorators';
import { RouteRegistry } from '../../src/router/registry';
import { getTestPort } from '../utils/test-port';

describe('Controller Path Combination', () => {
  let app: Application;
  let port: number;

  beforeEach(() => {
    port = getTestPort();
    app = new Application({ port });
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
  });

  test('should correctly combine base path with method path starting with /', async () => {
    @Controller('/api/products')
    class ProductController {
      @GET('/')
      public listProducts() {
        return { products: ['product1', 'product2'] };
      }

      @GET('/:id')
      public getProduct(@Param('id') id: string) {
        return { id, name: `Product ${id}` };
      }
    }

    app.registerController(ProductController);
    await app.listen();

    // 应该访问 /api/products，而不是 /
    const response = await fetch(`http://localhost:${port}/api/products`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.products).toBeDefined();

    // 访问 / 应该返回 404，而不是访问到 listProducts
    const rootResponse = await fetch(`http://localhost:${port}/`);
    expect(rootResponse.status).toBe(404);
  });

  test('should correctly combine base path with empty method path', async () => {
    @Controller('/api/users')
    class UserController {
      @GET('')
      public listUsers() {
        return { users: ['user1', 'user2'] };
      }
    }

    app.registerController(UserController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/users`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.users).toBeDefined();

    // 访问 / 应该返回 404
    const rootResponse = await fetch(`http://localhost:${port}/`);
    expect(rootResponse.status).toBe(404);
  });

  test('should correctly combine base path with method path without leading /', async () => {
    @Controller('/api/orders')
    class OrderController {
      @GET('list')
      public listOrders() {
        return { orders: ['order1', 'order2'] };
      }
    }

    app.registerController(OrderController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/orders/list`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.orders).toBeDefined();

    // 访问 /api/orders 应该返回 404
    const baseResponse = await fetch(`http://localhost:${port}/api/orders`);
    expect(baseResponse.status).toBe(404);
  });

  test('should handle root controller with method path /', async () => {
    @Controller('')
    class RootController {
      @GET('/')
      public root() {
        return { message: 'root' };
      }
    }

    app.registerController(RootController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('root');
  });

  test('should handle root controller with empty method path', async () => {
    @Controller('/')
    class RootController {
      @GET('')
      public root() {
        return { message: 'root' };
      }
    }

    app.registerController(RootController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('root');
  });

  test('should not allow / to match when controller has base path', async () => {
    @Controller('/api/products')
    class ProductController {
      @GET('/')
      public listProducts() {
        return { products: ['product1'] };
      }
    }

    @Controller('/')
    class RootController {
      @GET('/')
      public root() {
        return { message: 'root' };
      }
    }

    app.registerController(ProductController);
    app.registerController(RootController);
    await app.listen();

    // /api/products 应该访问 ProductController
    const productsResponse = await fetch(`http://localhost:${port}/api/products`);
    expect(productsResponse.status).toBe(200);
    const productsData = await productsResponse.json();
    expect(productsData.products).toBeDefined();

    // / 应该访问 RootController
    const rootResponse = await fetch(`http://localhost:${port}/`);
    expect(rootResponse.status).toBe(200);
    const rootData = await rootResponse.json();
    expect(rootData.message).toBe('root');
  });

  test('should handle multiple controllers with different base paths', async () => {
    @Controller('/api/products')
    class ProductController {
      @GET('/')
      public listProducts() {
        return { source: 'products' };
      }
    }

    @Controller('/api/users')
    class UserController {
      @GET('/')
      public listUsers() {
        return { source: 'users' };
      }
    }

    app.registerController(ProductController);
    app.registerController(UserController);
    await app.listen();

    // 访问 /api/products 应该返回 products
    const productsResponse = await fetch(`http://localhost:${port}/api/products`);
    expect(productsResponse.status).toBe(200);
    const productsData = await productsResponse.json();
    expect(productsData.source).toBe('products');

    // 访问 /api/users 应该返回 users
    const usersResponse = await fetch(`http://localhost:${port}/api/users`);
    expect(usersResponse.status).toBe(200);
    const usersData = await usersResponse.json();
    expect(usersData.source).toBe('users');

    // 访问 / 应该返回 404
    const rootResponse = await fetch(`http://localhost:${port}/`);
    expect(rootResponse.status).toBe(404);
  });

  test('should correctly combine root controller "/" with method path "/health"', async () => {
    // 这是 metrics-rate-limit-app.ts 示例中的场景
    // @Controller('/') + @GET('/health') 应该映射到 /health，而不是 //health
    @Controller('/')
    class HealthController {
      @GET('/health')
      public health() {
        return { status: 'ok' };
      }

      @GET('/')
      public index() {
        return { message: 'index' };
      }
    }

    app.registerController(HealthController);
    await app.listen();

    // /health 应该正常访问（修复前会得到 404，因为注册的路径是 //health）
    const healthResponse = await fetch(`http://localhost:${port}/health`);
    expect(healthResponse.status).toBe(200);
    const healthData = await healthResponse.json();
    expect(healthData.status).toBe('ok');

    // / 应该正常访问
    const rootResponse = await fetch(`http://localhost:${port}/`);
    expect(rootResponse.status).toBe(200);
    const rootData = await rootResponse.json();
    expect(rootData.message).toBe('index');

    // //health 不应该被访问到（或者应该重定向/返回 404）
    // 注：大多数 HTTP 服务器会规范化 //health 为 /health，所以这里可能返回 200
  });

  test('should correctly combine root controller "/" with multiple method paths', async () => {
    @Controller('/')
    class RootController {
      @GET('/api/status')
      public status() {
        return { status: 'running' };
      }

      @GET('/api/info')
      public info() {
        return { info: 'test' };
      }

      @POST('/api/data')
      public data() {
        return { received: true };
      }
    }

    app.registerController(RootController);
    await app.listen();

    // 所有路径都应该正常工作
    const statusResponse = await fetch(`http://localhost:${port}/api/status`);
    expect(statusResponse.status).toBe(200);
    expect((await statusResponse.json()).status).toBe('running');

    const infoResponse = await fetch(`http://localhost:${port}/api/info`);
    expect(infoResponse.status).toBe(200);
    expect((await infoResponse.json()).info).toBe('test');

    const dataResponse = await fetch(`http://localhost:${port}/api/data`, {
      method: 'POST',
    });
    expect(dataResponse.status).toBe(200);
    expect((await dataResponse.json()).received).toBe(true);
  });
});

