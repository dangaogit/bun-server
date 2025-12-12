import 'reflect-metadata';
import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Application } from '../../../src/core/application';
import { Controller, ControllerRegistry } from '../../../src/controller/controller';
import { GET } from '../../../src/router/decorators';
import { RouteRegistry } from '../../../src/router/registry';
import {
  Permission,
  PermissionInterceptor,
  PERMISSION_METADATA_KEY,
  InterceptorRegistry,
  INTERCEPTOR_REGISTRY_TOKEN,
  type PermissionService,
} from '../../../src/interceptor';
import { ForbiddenException } from '../../../src/error';
import { getTestPort } from '../../utils/test-port';

describe('PermissionInterceptor', () => {
  let app: Application;
  let port: number;
  let interceptorRegistry: InterceptorRegistry;

  beforeEach(() => {
    port = getTestPort();
    app = new Application({ port });
    interceptorRegistry = app.getContainer().resolve<InterceptorRegistry>(
      INTERCEPTOR_REGISTRY_TOKEN,
    );
    interceptorRegistry.register(PERMISSION_METADATA_KEY, new PermissionInterceptor());
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
    interceptorRegistry.clear();
  });

  test('should allow access when permission check passes', async () => {
    // 创建权限服务实现
    class MockPermissionService implements PermissionService {
      public async check(
        userId: string | null,
        resource: string,
        action: string,
      ): Promise<boolean> {
        return userId === 'user1' && resource === 'user' && action === 'read';
      }
    }

    // 注册权限服务
    app.getContainer().registerInstance(
      PermissionInterceptor.PERMISSION_SERVICE_TOKEN,
      new MockPermissionService(),
    );

    @Controller('/api/users')
    class UserController {
      @GET('/:id')
      @Permission({ resource: 'user', action: 'read' })
      public getUser() {
        return { id: '123', name: 'Test User' };
      }
    }

    app.registerController(UserController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/users/123`, {
      headers: { 'X-User-Id': 'user1' },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe('123');
  });

  test('should deny access when permission check fails', async () => {
    // 创建权限服务实现
    class MockPermissionService implements PermissionService {
      public async check(
        userId: string | null,
        resource: string,
        action: string,
      ): Promise<boolean> {
        return false; // 总是拒绝
      }
    }

    // 注册权限服务
    app.getContainer().registerInstance(
      PermissionInterceptor.PERMISSION_SERVICE_TOKEN,
      new MockPermissionService(),
    );

    @Controller('/api/users')
    class UserController {
      @GET('/:id')
      @Permission({ resource: 'user', action: 'read' })
      public getUser() {
        return { id: '123', name: 'Test User' };
      }
    }

    app.registerController(UserController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/users/123`, {
      headers: { 'X-User-Id': 'user1' },
    });

    expect(response.status).toBe(403);
  });

  test('should allow anonymous access when allowAnonymous is true', async () => {
    @Controller('/api/public')
    class PublicController {
      @GET('/')
      @Permission({
        resource: 'public',
        action: 'read',
        allowAnonymous: true,
      })
      public getPublicData() {
        return { data: 'public' };
      }
    }

    app.registerController(PublicController);
    await app.listen();

    // 没有提供用户 ID
    const response = await fetch(`http://localhost:${port}/api/public`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toBe('public');
  });

  test('should work without permission decorator', async () => {
    @Controller('/api/test')
    class TestController {
      @GET('/')
      public getData() {
        return { data: 'no-permission-check' };
      }
    }

    app.registerController(TestController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/test`);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.data).toBe('no-permission-check');
  });

  test('should throw error when PermissionService not registered', async () => {
    @Controller('/api/users')
    class UserController {
      @GET('/:id')
      @Permission({ resource: 'user', action: 'read' })
      public getUser() {
        return { id: '123' };
      }
    }

    app.registerController(UserController);
    await app.listen();

    const response = await fetch(`http://localhost:${port}/api/users/123`, {
      headers: { 'X-User-Id': 'user1' },
    });

    // 应该返回 500 错误（PermissionService 未注册）
    expect(response.status).toBe(500);
  });
});

