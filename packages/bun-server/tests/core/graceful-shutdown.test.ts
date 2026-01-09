import { describe, expect, test, afterEach, beforeEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { GET } from '../../src/router/decorators';
import { Param } from '../../src/controller/decorators';
import { getTestPort } from '../utils/test-port';
import { RouteRegistry } from '../../src/router/registry';

describe('Graceful Shutdown', () => {
  let app: Application;
  let port: number;

  beforeEach((done) => {
    port = getTestPort();
    done();
  });

  afterEach(async (done) => {
    if (app) {
      // 确保清理，使用 stop 而不是 gracefulShutdown 以避免测试间干扰
      try {
        const server = app.getServer();
        if (server?.isRunning()) {
          await app.stop();
          // 等待一小段时间确保端口释放
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
      } catch (error) {
        // 忽略错误，确保清理完成
      }
      app = undefined as any;
    }
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
    done();
  });

  test('should reject new requests during shutdown', async () => {
    @Controller('/api')
    class TestController {
      @GET('/test')
      public test() {
        return { message: 'ok' };
      }

      @GET('/slow')
      public async slow() {
        // 模拟慢请求，确保在停机过程中有活跃请求
        await new Promise((resolve) => setTimeout(resolve, 200));
        return { message: 'completed' };
      }
    }

    app = new Application({ port, enableSignalHandlers: false });
    app.registerController(TestController);
    await app.listen();

    const server = app.getServer();
    expect(server).toBeDefined();

    // 先发送一个慢请求，确保在停机过程中有活跃请求
    const slowRequestPromise = fetch(`http://localhost:${port}/api/slow`);

    // 等待请求开始处理
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 开始优雅停机（此时有活跃请求，服务器不会立即关闭）
    const shutdownPromise = app.gracefulShutdown(5000);

    // 等待一小段时间确保 shutdown 状态已设置
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 尝试发送新请求，应该被拒绝
    const response = await fetch(`http://localhost:${port}/api/test`);
    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Server is shutting down');

    // 等待慢请求完成
    await slowRequestPromise;

    // 等待停机完成
    await shutdownPromise;
  });

  test('should wait for active requests to complete', async () => {
    let requestCompleted = false;

    @Controller('/api')
    class TestController {
      @GET('/slow')
      public async slow() {
        // 模拟慢请求
        await new Promise((resolve) => setTimeout(resolve, 100));
        requestCompleted = true;
        return { message: 'completed' };
      }
    }

    app = new Application({ port, enableSignalHandlers: false });
    app.registerController(TestController);
    await app.listen();

    // 发送一个慢请求
    const requestPromise = fetch(`http://localhost:${port}/api/slow`);

    // 等待请求开始处理
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 开始优雅停机
    const shutdownPromise = app.gracefulShutdown(5000);

    // 等待请求完成
    const response = await requestPromise;
    expect(response.status).toBe(200);
    const data = (await response.json()) as { message: string };
    expect(data.message).toBe('completed');
    expect(requestCompleted).toBe(true);

    // 等待停机完成
    await shutdownPromise;

    const server = app.getServer();
    expect(server?.isRunning()).toBe(false);
  });

  test('should force shutdown after timeout', async () => {
    @Controller('/api')
    class TestController {
      @GET('/very-slow')
      public async verySlow() {
        // 模拟非常慢的请求（超过超时时间）
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return { message: 'completed' };
      }
    }

    app = new Application({ port, enableSignalHandlers: false });
    app.registerController(TestController);
    await app.listen();

    // 发送一个非常慢的请求
    const requestPromise = fetch(`http://localhost:${port}/api/very-slow`);

    // 等待请求开始处理
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 开始优雅停机，设置较短的超时时间
    const startTime = Date.now();
    await app.gracefulShutdown(500);
    const shutdownDuration = Date.now() - startTime;

    // 应该在大约 500ms 后强制关闭（允许一些误差）
    expect(shutdownDuration).toBeGreaterThanOrEqual(450);
    expect(shutdownDuration).toBeLessThan(1000);

    const server = app.getServer();
    expect(server?.isRunning()).toBe(false);

    // 请求可能仍在进行，但不应该影响服务器状态
    try {
      await requestPromise;
    } catch (error) {
      // 请求可能失败，这是预期的
    }
  });

  test('should handle multiple concurrent requests during shutdown', async () => {
    const completedRequests: number[] = [];

    @Controller('/api')
    class TestController {
      @GET('/concurrent/:id')
      public async concurrent(@Param('id') id: string) {
        // 模拟异步处理
        await new Promise((resolve) => setTimeout(resolve, 50));
        completedRequests.push(Number.parseInt(id));
        return { id, message: 'completed' };
      }
    }

    app = new Application({ port, enableSignalHandlers: false });
    app.registerController(TestController);
    await app.listen();

    // 发送多个并发请求
    const requests = Promise.all([
      fetch(`http://localhost:${port}/api/concurrent/1`),
      fetch(`http://localhost:${port}/api/concurrent/2`),
      fetch(`http://localhost:${port}/api/concurrent/3`),
    ]);

    // 等待请求开始处理
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 开始优雅停机
    const shutdownPromise = app.gracefulShutdown(5000);

    // 等待所有请求完成
    const responses = await requests;
    expect(responses.length).toBe(3);

    for (const response of responses) {
      expect(response.status).toBe(200);
      const data = (await response.json()) as { message: string };
      expect(data.message).toBe('completed');
    }

    // 所有请求应该都完成了
    expect(completedRequests.sort()).toEqual([1, 2, 3]);

    // 等待停机完成
    await shutdownPromise;
  });

  test('should handle graceful shutdown with no active requests', async () => {
    @Controller('/api')
    class TestController {
      @GET('/test')
      public test() {
        return { message: 'ok' };
      }
    }

    app = new Application({ port, enableSignalHandlers: false });
    app.registerController(TestController);
    await app.listen();

    const server = app.getServer();
    expect(server?.isRunning()).toBe(true);

    // 没有活跃请求时，应该立即关闭
    const startTime = Date.now();
    await app.gracefulShutdown(5000);
    const shutdownDuration = Date.now() - startTime;

    // 应该几乎立即关闭（允许一些处理时间）
    expect(shutdownDuration).toBeLessThan(100);

    expect(server?.isRunning()).toBe(false);
  });

  test('should track active requests correctly', async () => {
    @Controller('/api')
    class TestController {
      @GET('/slow')
      public async slow() {
        // 使用慢请求确保在检查时请求仍在处理中
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { message: 'ok' };
      }
    }

    app = new Application({ port, enableSignalHandlers: false });
    app.registerController(TestController);
    await app.listen();

    const server = app.getServer();
    expect(server).toBeDefined();

    // 发送慢请求
    const requestPromise = fetch(`http://localhost:${port}/api/slow`);

    // 等待请求开始处理（但不要等到完成）
    await new Promise((resolve) => setTimeout(resolve, 20));

    // 检查活跃请求数（应该大于 0，因为请求还在处理中）
    const activeRequests = server?.getActiveRequests() ?? 0;
    expect(activeRequests).toBeGreaterThan(0);

    // 等待请求完成
    await requestPromise;

    // 等待一小段时间确保计数更新
    await new Promise((resolve) => setTimeout(resolve, 20));

    // 活跃请求数应该回到 0
    const finalActiveRequests = server?.getActiveRequests() ?? 0;
    expect(finalActiveRequests).toBe(0);
  });

  test('should use custom graceful shutdown timeout', async () => {
    @Controller('/api')
    class TestController {
      @GET('/slow')
      public async slow() {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return { message: 'completed' };
      }
    }

    app = new Application({
      port,
      enableSignalHandlers: false,
      gracefulShutdownTimeout: 2000,
    });
    app.registerController(TestController);
    await app.listen();

    // 发送请求
    const requestPromise = fetch(`http://localhost:${port}/api/slow`);

    // 等待请求开始处理
    await new Promise((resolve) => setTimeout(resolve, 10));

    // 使用自定义超时时间（比配置的短）
    const startTime = Date.now();
    await app.gracefulShutdown(100);
    const shutdownDuration = Date.now() - startTime;

    // 应该在大约 100ms 后强制关闭
    expect(shutdownDuration).toBeGreaterThanOrEqual(80);
    expect(shutdownDuration).toBeLessThan(200);

    // 等待请求完成（可能失败）
    try {
      await requestPromise;
    } catch (error) {
      // 请求可能失败，这是预期的
    }
  });
});
