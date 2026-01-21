import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';
import {
  UseGuards,
  Roles,
  getGuardsMetadata,
  getRolesMetadata,
} from '../../../src/security/guards/decorators';
import {
  GUARDS_METADATA_KEY,
  ROLES_METADATA_KEY,
  type CanActivate,
  type ExecutionContext,
} from '../../../src/security/guards/types';
import { GuardRegistry } from '../../../src/security/guards/guard-registry';
import { ExecutionContextImpl } from '../../../src/security/guards/execution-context';
import { Reflector } from '../../../src/security/guards/reflector';
import { AuthGuard, OptionalAuthGuard } from '../../../src/security/guards/builtin/auth-guard';
import { RolesGuard, createRolesGuard } from '../../../src/security/guards/builtin/roles-guard';
import { Container } from '../../../src/di/container';
import { Context } from '../../../src/core/context';
import { SecurityContextHolder, SecurityContextImpl } from '../../../src/security/context';
import { Controller } from '../../../src/controller';
import { GET, POST } from '../../../src/router/decorators';
import { Injectable } from '../../../src/di/decorators';

// 测试用守卫
class TestGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    return true;
  }
}

class RejectGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    return false;
  }
}

@Injectable()
class AsyncGuard implements CanActivate {
  public async canActivate(context: ExecutionContext): Promise<boolean> {
    await new Promise((resolve) => setTimeout(resolve, 10));
    return true;
  }
}

describe('Guards Decorators', () => {
  beforeEach(() => {
    // 清理元数据
  });

  test('@UseGuards should add guards metadata to class', () => {
    @UseGuards(TestGuard)
    class TestController {}

    const guards = getGuardsMetadata(TestController);
    expect(guards).toHaveLength(1);
    expect(guards[0]).toBe(TestGuard);
  });

  test('@UseGuards should add guards metadata to method', () => {
    class TestController {
      @UseGuards(TestGuard)
      public testMethod() {}
    }

    const guards = getGuardsMetadata(TestController.prototype, 'testMethod');
    expect(guards).toHaveLength(1);
    expect(guards[0]).toBe(TestGuard);
  });

  test('@UseGuards should support multiple guards', () => {
    @UseGuards(TestGuard, RejectGuard)
    class TestController {}

    const guards = getGuardsMetadata(TestController);
    expect(guards).toHaveLength(2);
    expect(guards[0]).toBe(TestGuard);
    expect(guards[1]).toBe(RejectGuard);
  });

  test('@UseGuards should support guard instances', () => {
    const guardInstance = new TestGuard();

    @UseGuards(guardInstance)
    class TestController {}

    const guards = getGuardsMetadata(TestController);
    expect(guards).toHaveLength(1);
    expect(guards[0]).toBe(guardInstance);
  });

  test('@Roles should add roles metadata to method', () => {
    class TestController {
      @Roles('admin', 'user')
      public testMethod() {}
    }

    const roles = getRolesMetadata(TestController.prototype, 'testMethod');
    expect(roles).toEqual(['admin', 'user']);
  });

  test('@Roles should add roles metadata to class', () => {
    @Roles('admin')
    class TestController {}

    const roles = getRolesMetadata(TestController);
    expect(roles).toEqual(['admin']);
  });
});

describe('GuardRegistry', () => {
  let registry: GuardRegistry;
  let container: Container;

  beforeEach(() => {
    registry = new GuardRegistry();
    container = new Container();
  });

  test('should add and get global guards', () => {
    registry.addGlobalGuards(TestGuard);
    
    const guards = registry.getGlobalGuards();
    expect(guards).toHaveLength(1);
    expect(guards[0]).toBe(TestGuard);
  });

  test('should clear global guards', () => {
    registry.addGlobalGuards(TestGuard);
    registry.clearGlobalGuards();
    
    const guards = registry.getGlobalGuards();
    expect(guards).toHaveLength(0);
  });

  test('should collect guards from class and method', () => {
    @UseGuards(TestGuard)
    @Controller('/test')
    class TestController {
      @UseGuards(RejectGuard)
      @GET('/')
      public testMethod() {}
    }

    const guards = registry.collectGuards(TestController, 'testMethod');
    expect(guards).toHaveLength(2);
    expect(guards[0]).toBe(TestGuard);
    expect(guards[1]).toBe(RejectGuard);
  });

  test('should execute guards in order', async () => {
    const executionOrder: string[] = [];

    class Guard1 implements CanActivate {
      public canActivate(): boolean {
        executionOrder.push('guard1');
        return true;
      }
    }

    class Guard2 implements CanActivate {
      public canActivate(): boolean {
        executionOrder.push('guard2');
        return true;
      }
    }

    @UseGuards(Guard1, Guard2)
    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const request = new Request('http://localhost/test');
    const ctx = new Context(request);
    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    await registry.executeGuards(executionContext, container);

    expect(executionOrder).toEqual(['guard1', 'guard2']);
  });

  test('should throw ForbiddenException when guard returns false', async () => {
    @UseGuards(RejectGuard)
    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const request = new Request('http://localhost/test');
    const ctx = new Context(request);
    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    await expect(registry.executeGuards(executionContext, container)).rejects.toThrow(
      'Access denied by guard: RejectGuard',
    );
  });

  test('should resolve guard from DI container', async () => {
    @Injectable()
    class InjectedGuard implements CanActivate {
      public canActivate(): boolean {
        return true;
      }
    }

    container.register(InjectedGuard, InjectedGuard);

    @UseGuards(InjectedGuard)
    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const request = new Request('http://localhost/test');
    const ctx = new Context(request);
    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    const result = await registry.executeGuards(executionContext, container);
    expect(result).toBe(true);
  });

  test('should support async guards', async () => {
    @UseGuards(AsyncGuard)
    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const request = new Request('http://localhost/test');
    const ctx = new Context(request);
    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    const result = await registry.executeGuards(executionContext, container);
    expect(result).toBe(true);
  });
});

describe('ExecutionContext', () => {
  test('should provide HTTP context', () => {
    const request = new Request('http://localhost/test');
    const ctx = new Context(request);

    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    const httpHost = executionContext.switchToHttp();
    expect(httpHost.getRequest()).toBe(ctx);
    expect(httpHost.getResponse()).toBeUndefined();
  });

  test('should return controller class', () => {
    const request = new Request('http://localhost/test');
    const ctx = new Context(request);

    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    expect(executionContext.getClass()).toBe(TestController);
  });

  test('should return method name', () => {
    const request = new Request('http://localhost/test');
    const ctx = new Context(request);

    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    expect(executionContext.getMethodName()).toBe('testMethod');
  });

  test('should get metadata from method', () => {
    const request = new Request('http://localhost/test');
    const ctx = new Context(request);

    @Controller('/test')
    class TestController {
      @Roles('admin')
      @GET('/')
      public testMethod() {}
    }

    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    const roles = executionContext.getMetadata<string[]>(ROLES_METADATA_KEY);
    expect(roles).toEqual(['admin']);
  });

  test('should get metadata from class if not on method', () => {
    const request = new Request('http://localhost/test');
    const ctx = new Context(request);

    @Roles('admin')
    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    const roles = executionContext.getMetadata<string[]>(ROLES_METADATA_KEY);
    expect(roles).toEqual(['admin']);
  });

  test('should throw error when accessing WebSocket context if not set', () => {
    const request = new Request('http://localhost/test');
    const ctx = new Context(request);

    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    expect(() => executionContext.switchToWs()).toThrow('WebSocket context is not available');
  });
});

describe('Reflector', () => {
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
  });

  test('should get metadata from class', () => {
    @Roles('admin')
    class TestController {}

    const roles = reflector.getFromClass<string[]>(ROLES_METADATA_KEY, TestController);
    expect(roles).toEqual(['admin']);
  });

  test('should get metadata from method', () => {
    class TestController {
      @Roles('user')
      public testMethod() {}
    }

    const roles = reflector.getFromMethod<string[]>(
      ROLES_METADATA_KEY,
      TestController.prototype,
      'testMethod',
    );
    expect(roles).toEqual(['user']);
  });

  test('should merge metadata from class and method', () => {
    @Roles('admin')
    class TestController {
      @Roles('user')
      public testMethod() {}
    }

    const roles = reflector.getAllAndMerge<string[]>(
      ROLES_METADATA_KEY,
      TestController,
      'testMethod',
    );
    expect(roles).toEqual(['admin', 'user']);
  });

  test('should override class metadata with method metadata', () => {
    @Roles('admin')
    class TestController {
      @Roles('user')
      public testMethod() {}
    }

    const roles = reflector.getAllAndOverride<string[]>(
      ROLES_METADATA_KEY,
      TestController,
      'testMethod',
    );
    expect(roles).toEqual(['user']);
  });

  test('should return class metadata when method has none', () => {
    @Roles('admin')
    class TestController {
      public testMethod() {}
    }

    const roles = reflector.getAllAndOverride<string[]>(
      ROLES_METADATA_KEY,
      TestController,
      'testMethod',
    );
    expect(roles).toEqual(['admin']);
  });
});

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(() => {
    guard = new AuthGuard();
    SecurityContextHolder.clearContext();
  });

  test('should throw UnauthorizedException when not authenticated', () => {
    const request = new Request('http://localhost/test');
    const ctx = new Context(request);

    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    expect(() => guard.canActivate(executionContext)).toThrow('Authentication required');
  });

  test('should return true when authenticated', async () => {
    // 在 SecurityContextHolder 的上下文中运行
    await SecurityContextHolder.runWithContext(async () => {
      const securityContext = SecurityContextHolder.getContext();
      securityContext.setAuthentication({
        authenticated: true,
        principal: { id: '1', username: 'test' },
        credentials: null,
        authorities: [],
      });

      const request = new Request('http://localhost/test');
      const ctx = new Context(request);

      @Controller('/test')
      class TestController {
        @GET('/')
        public testMethod() {}
      }

      const executionContext = new ExecutionContextImpl(
        ctx,
        TestController,
        'testMethod',
        TestController.prototype.testMethod,
      );

      const result = guard.canActivate(executionContext);
      expect(result).toBe(true);
    });
  });
});

describe('OptionalAuthGuard', () => {
  test('should always return true', () => {
    const guard = new OptionalAuthGuard();
    const request = new Request('http://localhost/test');
    const ctx = new Context(request);

    @Controller('/test')
    class TestController {
      @GET('/')
      public testMethod() {}
    }

    const executionContext = new ExecutionContextImpl(
      ctx,
      TestController,
      'testMethod',
      TestController.prototype.testMethod,
    );

    const result = guard.canActivate(executionContext);
    expect(result).toBe(true);
  });
});

describe('RolesGuard', () => {
  let guard: RolesGuard;

  beforeEach(() => {
    guard = new RolesGuard();
    SecurityContextHolder.clearContext();
  });

  test('should return true when no roles required', async () => {
    await SecurityContextHolder.runWithContext(async () => {
      const request = new Request('http://localhost/test');
      const ctx = new Context(request);

      @Controller('/test')
      class TestController {
        @GET('/')
        public testMethod() {}
      }

      const executionContext = new ExecutionContextImpl(
        ctx,
        TestController,
        'testMethod',
        TestController.prototype.testMethod,
      );

      const result = guard.canActivate(executionContext);
      expect(result).toBe(true);
    });
  });

  test('should return true when user has required role', async () => {
    await SecurityContextHolder.runWithContext(async () => {
      const securityContext = SecurityContextHolder.getContext();
      securityContext.setAuthentication({
        authenticated: true,
        principal: { id: '1', username: 'test' },
        credentials: null,
        authorities: ['admin'],
      });

      const request = new Request('http://localhost/test');
      const ctx = new Context(request);

      @Controller('/test')
      class TestController {
        @Roles('admin')
        @GET('/')
        public testMethod() {}
      }

      const executionContext = new ExecutionContextImpl(
        ctx,
        TestController,
        'testMethod',
        TestController.prototype.testMethod,
      );

      const result = guard.canActivate(executionContext);
      expect(result).toBe(true);
    });
  });

  test('should throw ForbiddenException when user lacks required role', async () => {
    await SecurityContextHolder.runWithContext(async () => {
      const securityContext = SecurityContextHolder.getContext();
      securityContext.setAuthentication({
        authenticated: true,
        principal: { id: '1', username: 'test' },
        credentials: null,
        authorities: ['user'],
      });

      const request = new Request('http://localhost/test');
      const ctx = new Context(request);

      @Controller('/test')
      class TestController {
        @Roles('admin')
        @GET('/')
        public testMethod() {}
      }

      const executionContext = new ExecutionContextImpl(
        ctx,
        TestController,
        'testMethod',
        TestController.prototype.testMethod,
      );

      expect(() => guard.canActivate(executionContext)).toThrow('Access denied');
    });
  });

  test('should throw ForbiddenException when not authenticated', async () => {
    await SecurityContextHolder.runWithContext(async () => {
      const request = new Request('http://localhost/test');
      const ctx = new Context(request);

      @Controller('/test')
      class TestController {
        @Roles('admin')
        @GET('/')
        public testMethod() {}
      }

      const executionContext = new ExecutionContextImpl(
        ctx,
        TestController,
        'testMethod',
        TestController.prototype.testMethod,
      );

      expect(() => guard.canActivate(executionContext)).toThrow(
        'Access denied: authentication required for role check',
      );
    });
  });
});

describe('createRolesGuard', () => {
  test('should create custom roles guard with matchAll option', async () => {
    const CustomGuard = createRolesGuard({ matchAll: true });
    const guard = new CustomGuard();

    await SecurityContextHolder.runWithContext(async () => {
      const securityContext = SecurityContextHolder.getContext();
      securityContext.setAuthentication({
        authenticated: true,
        principal: { id: '1', username: 'test' },
        credentials: null,
        authorities: ['admin', 'user'],
      });

      const request = new Request('http://localhost/test');
      const ctx = new Context(request);

      @Controller('/test')
      class TestController {
        @Roles('admin', 'user')
        @GET('/')
        public testMethod() {}
      }

      const executionContext = new ExecutionContextImpl(
        ctx,
        TestController,
        'testMethod',
        TestController.prototype.testMethod,
      );

      const result = guard.canActivate(executionContext);
      expect(result).toBe(true);
    });
  });

  test('should fail matchAll when missing one role', async () => {
    const CustomGuard = createRolesGuard({ matchAll: true });
    const guard = new CustomGuard();

    await SecurityContextHolder.runWithContext(async () => {
      const securityContext = SecurityContextHolder.getContext();
      securityContext.setAuthentication({
        authenticated: true,
        principal: { id: '1', username: 'test' },
        credentials: null,
        authorities: ['admin'],
      });

      const request = new Request('http://localhost/test');
      const ctx = new Context(request);

      @Controller('/test')
      class TestController {
        @Roles('admin', 'superadmin')
        @GET('/')
        public testMethod() {}
      }

      const executionContext = new ExecutionContextImpl(
        ctx,
        TestController,
        'testMethod',
        TestController.prototype.testMethod,
      );

      expect(() => guard.canActivate(executionContext)).toThrow('Access denied');
    });
  });

  test('should use custom getRoles function', async () => {
    const CustomGuard = createRolesGuard({
      getRoles: (context) => {
        const ctx = context.switchToHttp().getRequest();
        return (ctx as any).customRoles || [];
      },
    });
    const guard = new CustomGuard();

    await SecurityContextHolder.runWithContext(async () => {
      const request = new Request('http://localhost/test');
      const ctx = new Context(request);
      (ctx as any).customRoles = ['admin'];

      @Controller('/test')
      class TestController {
        @Roles('admin')
        @GET('/')
        public testMethod() {}
      }

      const executionContext = new ExecutionContextImpl(
        ctx,
        TestController,
        'testMethod',
        TestController.prototype.testMethod,
      );

      const result = guard.canActivate(executionContext);
      expect(result).toBe(true);
    });
  });
});

