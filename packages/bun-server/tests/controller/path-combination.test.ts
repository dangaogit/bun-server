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

/**
 * 路径规范化测试
 * 根据图片中的测试矩阵，验证各种路径组合是否都能正确映射到 /api/base
 *
 * 配置组合          | 拼接结果       | 规范化后路径  | 是否命中 /api/base
 * [/ + /api/base]   | //api/base    | /api/base    | 是
 * [// + /api/base]  | ///api/base   | /api/base    | 是
 * [/api + /base]    | /api/base     | /api/base    | 是
 * [/api/ + base]    | /api/base     | /api/base    | 是
 * [/api/base + ""]  | /api/base     | /api/base    | 是
 */
describe('Controller Path Normalization', () => {
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

  // 场景 1: [/ + /api/base] -> //api/base -> /api/base
  test('should normalize "/" + "/api/base" to "/api/base"', async () => {
    @Controller('/')
    class TestController {
      @GET('/api/base')
      public handler() {
        return { success: true, scenario: 1 };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/base`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.scenario).toBe(1);
  });

  // 场景 2: [// + /api/base] -> ///api/base -> /api/base
  test('should normalize "//" + "/api/base" to "/api/base"', async () => {
    @Controller('//')
    class TestController {
      @GET('/api/base')
      public handler() {
        return { success: true, scenario: 2 };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/base`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.scenario).toBe(2);
  });

  // 场景 3: [/api + /base] -> /api/base -> /api/base
  test('should normalize "/api" + "/base" to "/api/base"', async () => {
    @Controller('/api')
    class TestController {
      @GET('/base')
      public handler() {
        return { success: true, scenario: 3 };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/base`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.scenario).toBe(3);
  });

  // 场景 4: [/api/ + base] -> /api/base -> /api/base
  test('should normalize "/api/" + "base" to "/api/base"', async () => {
    @Controller('/api/')
    class TestController {
      @GET('base')
      public handler() {
        return { success: true, scenario: 4 };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/base`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.scenario).toBe(4);
  });

  // 场景 5: [/api/base + ""] -> /api/base -> /api/base
  test('should normalize "/api/base" + "" to "/api/base"', async () => {
    @Controller('/api/base')
    class TestController {
      @GET('')
      public handler() {
        return { success: true, scenario: 5 };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/base`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.scenario).toBe(5);
  });

  // 额外场景: [/api/base + /] -> /api/base/ 或 /api/base
  test('should normalize "/api/base" + "/" to "/api/base"', async () => {
    @Controller('/api/base')
    class TestController {
      @GET('/')
      public handler() {
        return { success: true, scenario: 6 };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/base`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.scenario).toBe(6);
  });

  // 场景: [/// + /api/base] -> /api/base (多个前导斜杠)
  test('should normalize "///" + "/api/base" to "/api/base"', async () => {
    @Controller('///')
    class TestController {
      @GET('/api/base')
      public handler() {
        return { success: true, scenario: 'triple-slash' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/base`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // 场景: [/api// + //base] -> /api/base (多个连续斜杠)
  test('should normalize "/api//" + "//base" to "/api/base"', async () => {
    @Controller('/api//')
    class TestController {
      @GET('//base')
      public handler() {
        return { success: true, scenario: 'double-slashes' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/base`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // 场景: ["" + /api/base] -> /api/base (空基础路径)
  test('should normalize "" + "/api/base" to "/api/base"', async () => {
    @Controller('')
    class TestController {
      @GET('/api/base')
      public handler() {
        return { success: true, scenario: 'empty-base' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/base`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  // 场景 a: @Controller() + @GET('test') / @POST('test') -> /test
  test('scenario a: @Controller() with @GET("test") and @POST("test") should match /test', async () => {
    @Controller()
    class TestController {
      @GET('test')
      public getTest() {
        return { method: 'GET', path: 'test' };
      }

      @POST('test')
      public postTest() {
        return { method: 'POST', path: 'test' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const getRes = await fetch(`http://localhost:${port}/test`);
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).method).toBe('GET');

    const postRes = await fetch(`http://localhost:${port}/test`, { method: 'POST' });
    expect(postRes.status).toBe(200);
    expect((await postRes.json()).method).toBe('POST');
  });

  // 场景 b: @Controller() + @GET('/test') / @POST('/test') -> /test
  test('scenario b: @Controller() with @GET("/test") and @POST("/test") should match /test', async () => {
    @Controller()
    class TestController {
      @GET('/test')
      public getTest() {
        return { method: 'GET', path: 'test' };
      }

      @POST('/test')
      public postTest() {
        return { method: 'POST', path: 'test' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const getRes = await fetch(`http://localhost:${port}/test`);
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).method).toBe('GET');

    const postRes = await fetch(`http://localhost:${port}/test`, { method: 'POST' });
    expect(postRes.status).toBe(200);
    expect((await postRes.json()).method).toBe('POST');
  });

  // 场景 c: @Controller('') + @GET() / @POST() -> /
  test('scenario c: @Controller("") with @GET() and @POST() should match /', async () => {
    @Controller('')
    class TestController {
      @GET()
      public getRoot() {
        return { method: 'GET', path: '/' };
      }

      @POST()
      public postRoot() {
        return { method: 'POST', path: '/' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const getRes = await fetch(`http://localhost:${port}/`);
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).method).toBe('GET');

    const postRes = await fetch(`http://localhost:${port}/`, { method: 'POST' });
    expect(postRes.status).toBe(200);
    expect((await postRes.json()).method).toBe('POST');
  });

  // 场景 d: @Controller() + @GET() / @POST() -> /
  test('scenario d: @Controller() with @GET() and @POST() should match /', async () => {
    @Controller()
    class TestController {
      @GET()
      public getRoot() {
        return { method: 'GET', path: '/' };
      }

      @POST()
      public postRoot() {
        return { method: 'POST', path: '/' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const getRes = await fetch(`http://localhost:${port}/`);
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).method).toBe('GET');

    const postRes = await fetch(`http://localhost:${port}/`, { method: 'POST' });
    expect(postRes.status).toBe(200);
    expect((await postRes.json()).method).toBe('POST');
  });

  // 场景 e: @Controller() + @GET('/') / @POST('/') -> /
  test('scenario e: @Controller() with @GET("/") and @POST("/") should match /', async () => {
    @Controller()
    class TestController {
      @GET('/')
      public getRoot() {
        return { method: 'GET', path: '/' };
      }

      @POST('/')
      public postRoot() {
        return { method: 'POST', path: '/' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const getRes = await fetch(`http://localhost:${port}/`);
    expect(getRes.status).toBe(200);
    expect((await getRes.json()).method).toBe('GET');

    const postRes = await fetch(`http://localhost:${port}/`, { method: 'POST' });
    expect(postRes.status).toBe(200);
    expect((await postRes.json()).method).toBe('POST');
  });

  // 测试所有场景在同一应用中同时工作
  test('should handle all path normalization scenarios simultaneously', async () => {
    @Controller('/')
    class RootController {
      @GET('/health')
      public health() {
        return { endpoint: 'health' };
      }
    }

    @Controller('/api')
    class ApiController {
      @GET('/users')
      public users() {
        return { endpoint: 'users' };
      }

      @GET('products')
      public products() {
        return { endpoint: 'products' };
      }
    }

    @Controller('/api/')
    class ApiSlashController {
      @GET('orders')
      public orders() {
        return { endpoint: 'orders' };
      }
    }

    @Controller('/v1/api')
    class V1Controller {
      @GET('')
      public root() {
        return { endpoint: 'v1-root' };
      }

      @GET('/')
      public index() {
        return { endpoint: 'v1-index' };
      }
    }

    app.registerController(RootController);
    app.registerController(ApiController);
    app.registerController(ApiSlashController);
    app.registerController(V1Controller);
    await app.listen();

    // 验证所有端点
    const healthRes = await fetch(`http://localhost:${port}/health`);
    expect(healthRes.status).toBe(200);
    expect((await healthRes.json()).endpoint).toBe('health');

    const usersRes = await fetch(`http://localhost:${port}/api/users`);
    expect(usersRes.status).toBe(200);
    expect((await usersRes.json()).endpoint).toBe('users');

    const productsRes = await fetch(`http://localhost:${port}/api/products`);
    expect(productsRes.status).toBe(200);
    expect((await productsRes.json()).endpoint).toBe('products');

    const ordersRes = await fetch(`http://localhost:${port}/api/orders`);
    expect(ordersRes.status).toBe(200);
    expect((await ordersRes.json()).endpoint).toBe('orders');

    const v1Res = await fetch(`http://localhost:${port}/v1/api`);
    expect(v1Res.status).toBe(200);
    // v1-root 或 v1-index，取决于哪个先注册
    const v1Data = await v1Res.json();
    expect(['v1-root', 'v1-index']).toContain(v1Data.endpoint);
  });
});

