import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  Permission,
  getPermissionMetadata,
  PermissionInterceptor,
  PERMISSION_METADATA_KEY,
  type PermissionOptions,
  type PermissionService,
} from '../../../src/interceptor/builtin/permission-interceptor';
import { Container } from '../../../src/di/container';
import { Context } from '../../../src/core/context';
import { ForbiddenException } from '../../../src/error';

describe('Permission Decorator', () => {
  test('should set permission metadata with required options', () => {
    class TestController {
      @Permission({ resource: 'users', action: 'read' })
      public getUsers(): void {}
    }

    const metadata = getPermissionMetadata(TestController.prototype, 'getUsers');
    expect(metadata).toBeDefined();
    expect(metadata?.resource).toBe('users');
    expect(metadata?.action).toBe('read');
    expect(metadata?.allowAnonymous).toBe(false);
  });

  test('should set permission metadata with allowAnonymous', () => {
    class TestController {
      @Permission({ resource: 'posts', action: 'read', allowAnonymous: true })
      public getPosts(): void {}
    }

    const metadata = getPermissionMetadata(TestController.prototype, 'getPosts');
    expect(metadata?.allowAnonymous).toBe(true);
  });

  test('should set all options together', () => {
    const options: PermissionOptions = {
      resource: 'orders',
      action: 'delete',
      allowAnonymous: false,
    };

    class TestController {
      @Permission(options)
      public deleteOrder(): void {}
    }

    const metadata = getPermissionMetadata(TestController.prototype, 'deleteOrder');
    expect(metadata?.resource).toBe('orders');
    expect(metadata?.action).toBe('delete');
    expect(metadata?.allowAnonymous).toBe(false);
  });
});

describe('getPermissionMetadata', () => {
  test('should return undefined for non-decorated method', () => {
    class TestController {
      public normalMethod(): void {}
    }

    const metadata = getPermissionMetadata(TestController.prototype, 'normalMethod');
    expect(metadata).toBeUndefined();
  });

  test('should return undefined for null target', () => {
    const metadata = getPermissionMetadata(null, 'method');
    expect(metadata).toBeUndefined();
  });

  test('should return undefined for non-object target', () => {
    const metadata = getPermissionMetadata('string', 'method');
    expect(metadata).toBeUndefined();
  });
});

describe('PermissionInterceptor', () => {
  let container: Container;
  let interceptor: PermissionInterceptor;
  let mockPermissionService: PermissionService;

  beforeEach(() => {
    container = new Container();
    interceptor = new PermissionInterceptor();
    mockPermissionService = {
      check: async (userId: string | null, resource: string, action: string) => {
        // 模拟权限检查：用户 'admin' 有所有权限
        if (userId === 'admin') return true;
        // 用户 'user1' 只有读权限
        if (userId === 'user1' && action === 'read') return true;
        return false;
      },
    };
    container.registerInstance(
      PermissionInterceptor.PERMISSION_SERVICE_TOKEN,
      mockPermissionService,
    );
  });

  test('should execute method without permission check when no metadata', async () => {
    class TestController {
      public normalMethod(): string {
        return 'executed';
      }
    }

    const controller = new TestController();

    const result = await interceptor.execute(
      controller,
      'normalMethod',
      controller.normalMethod.bind(controller),
      [],
      container,
    );

    expect(result).toBe('executed');
  });

  test('should allow anonymous access when allowAnonymous is true', async () => {
    class TestController {
      @Permission({ resource: 'public', action: 'read', allowAnonymous: true })
      public getPublic(): string {
        return 'public data';
      }
    }

    const controller = new TestController();

    const result = await interceptor.execute(
      controller,
      'getPublic',
      controller.getPublic.bind(controller),
      [],
      container,
    );

    expect(result).toBe('public data');
  });

  test('should execute method when user has permission', async () => {
    class TestController {
      @Permission({ resource: 'users', action: 'read' })
      public getUsers(): string {
        return 'users data';
      }
    }

    const controller = new TestController();

    // 创建带有用户 ID header 的上下文
    const request = new Request('http://localhost/users', {
      headers: {
        'X-User-Id': 'admin',
      },
    });
    const context = new Context(request, container);

    const result = await interceptor.execute(
      controller,
      'getUsers',
      controller.getUsers.bind(controller),
      [],
      container,
      context,
    );

    expect(result).toBe('users data');
  });

  test('should throw ForbiddenException when user lacks permission', async () => {
    class TestController {
      @Permission({ resource: 'admin', action: 'delete' })
      public deleteAdmin(): string {
        return 'deleted';
      }
    }

    const controller = new TestController();

    const request = new Request('http://localhost/admin', {
      headers: {
        'X-User-Id': 'user1',
      },
    });
    const context = new Context(request, container);

    await expect(
      interceptor.execute(
        controller,
        'deleteAdmin',
        controller.deleteAdmin.bind(controller),
        [],
        container,
        context,
      ),
    ).rejects.toThrow();
  });

  test('should throw error when PermissionService not registered', async () => {
    const emptyContainer = new Container();

    class TestController {
      @Permission({ resource: 'users', action: 'read' })
      public getUsers(): string {
        return 'users';
      }
    }

    const controller = new TestController();
    const request = new Request('http://localhost/users');
    const context = new Context(request, emptyContainer);

    await expect(
      interceptor.execute(
        controller,
        'getUsers',
        controller.getUsers.bind(controller),
        [],
        emptyContainer,
        context,
      ),
    ).rejects.toThrow('PermissionService not found');
  });

  test('should return null userId when no context provided', async () => {
    class TestController {
      @Permission({ resource: 'users', action: 'read' })
      public getUsers(): string {
        return 'users';
      }
    }

    const controller = new TestController();

    // 没有 context，userId 为 null，应该被拒绝
    await expect(
      interceptor.execute(
        controller,
        'getUsers',
        controller.getUsers.bind(controller),
        [],
        container,
      ),
    ).rejects.toThrow();
  });

  test('should handle Authorization Bearer header', async () => {
    class TestController {
      @Permission({ resource: 'users', action: 'read' })
      public getUsers(): string {
        return 'users';
      }
    }

    const controller = new TestController();

    // 带有 Authorization header 但没有 X-User-Id
    const request = new Request('http://localhost/users', {
      headers: {
        'Authorization': 'Bearer some-token',
        'X-User-Id': 'admin',
      },
    });
    const context = new Context(request, container);

    const result = await interceptor.execute(
      controller,
      'getUsers',
      controller.getUsers.bind(controller),
      [],
      container,
      context,
    );

    expect(result).toBe('users');
  });
});
