import { beforeEach, afterEach, describe, expect, test } from 'bun:test';

import { Application } from '../../src/core/application';
import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { GET } from '../../src/router/decorators';
import { Module } from '../../src/di/module';
import { ModuleRegistry } from '../../src/di/module-registry';
import { RouteRegistry } from '../../src/router/registry';
import { Injectable, Inject } from '../../src/di/decorators';
import { Context } from '../../src/core/context';

describe('ModuleRegistry', () => {
  beforeEach(() => {
    // 清理全局注册表，避免测试间污染
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
    ModuleRegistry.getInstance().clear();
  });

  afterEach(() => {
    // 确保测试后清理
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
    ModuleRegistry.getInstance().clear();
  });

  test('should register module providers and controllers', async () => {
    @Injectable()
    class UserService {
      public list(): string {
        return 'users';
      }
    }

    @Controller('/module-users')
    class UserController {
      public constructor(private readonly service: UserService) {}

      @GET('/')
      public getUsers(): string {
        return this.service.list();
      }
    }

    @Module({
      controllers: [UserController],
      providers: [UserService],
      exports: [UserService],
    })
    class UserModule {}

    const app = new Application();
    app.registerModule(UserModule);

    const moduleRef = ModuleRegistry.getInstance().getModuleRef(UserModule);
    expect(moduleRef).toBeDefined();
    expect(moduleRef?.container.resolve(UserService).list()).toBe('users');

    const router = RouteRegistry.getInstance().getRouter();
    const context = new Context(new Request('http://localhost/module-users'));
    const response = await router.handle(context);
    expect(await response?.text()).toBe('users');
  });

  test('should share exported providers between imported modules', () => {
    @Injectable()
    class SharedService {
      public readonly id = Math.random();
    }

    @Module({
      providers: [SharedService],
      exports: [SharedService],
    })
    class SharedModule {}

    @Injectable()
    class FeatureService {
      public constructor(@Inject(SharedService) public readonly shared: SharedService) {}
    }

    @Module({
      imports: [SharedModule],
      providers: [FeatureService],
      exports: [FeatureService],
    })
    class FeatureModule {}

    const app = new Application();
    app.registerModule(FeatureModule);

    const registry = ModuleRegistry.getInstance();
    const sharedRef = registry.getModuleRef(SharedModule);
    const featureRef = registry.getModuleRef(FeatureModule);
    expect(sharedRef).toBeDefined();
    expect(featureRef).toBeDefined();

    const sharedFromFeature = featureRef!.container.resolve(SharedService);
    const sharedFromModule = sharedRef!.container.resolve(SharedService);
    expect(sharedFromFeature).toBe(sharedFromModule);

    const featureService = featureRef!.container.resolve(FeatureService);
    expect(featureService.shared).toBe(sharedFromModule);
  });

  test('useExisting: alias token resolves to same instance as useExisting target', () => {
    const ALIAS = Symbol.for('test.useExisting.alias');

    @Injectable()
    class SomeService {
      public readonly n = 42;
    }

    @Module({
      providers: [SomeService, { provide: ALIAS, useExisting: SomeService }],
      exports: [SomeService, ALIAS],
    })
    class TestModule {}

    const app = new Application();
    app.registerModule(TestModule);

    const ref = ModuleRegistry.getInstance().getModuleRef(TestModule)!;
    const byClass = ref.container.resolve(SomeService);
    const byAlias = ref.container.resolve(ALIAS);
    expect(Object.is(byAlias, byClass)).toBe(true);
  });

  test('useExisting: exported Symbol alias can be resolved from importing module container', () => {
    const TOKEN = Symbol.for('test.useExisting.export');

    @Injectable()
    class CoreService {
      public ping(): string {
        return 'pong';
      }
    }

    @Module({
      providers: [CoreService, { provide: TOKEN, useExisting: CoreService }],
      exports: [TOKEN, CoreService],
    })
    class CoreModule {}

    @Injectable()
    class Consumer {
      public constructor(@Inject(TOKEN) public readonly core: CoreService) {}
    }

    @Module({
      imports: [CoreModule],
      providers: [Consumer],
    })
    class AppModule {}

    const app = new Application();
    app.registerModule(AppModule);

    const appRef = ModuleRegistry.getInstance().getModuleRef(AppModule)!;
    const consumer = appRef.container.resolve(Consumer);
    expect(consumer.core.ping()).toBe('pong');
  });

  test('useExisting: when target token is not registered, resolve throws', () => {
    const ALIAS = Symbol.for('test.useExisting.orphan');
    const MISSING = Symbol.for('test.useExisting.missing');

    @Module({
      providers: [{ provide: ALIAS, useExisting: MISSING }],
    })
    class BadModule {}

    const app = new Application();
    app.registerModule(BadModule);

    const ref = ModuleRegistry.getInstance().getModuleRef(BadModule)!;
    expect(() => ref.container.resolve(ALIAS)).toThrow(/Provider not found/);
  });

  test('should throw error for circular module dependencies', () => {
    @Module({
      imports: [],
    })
    class ModuleA {}

    @Module({
      imports: [ModuleA],
    })
    class ModuleB {}

    // 重新装饰 ModuleA，使其导入 ModuleB，形成环
    Module({
      imports: [ModuleB],
    })(ModuleA);

    const app = new Application();
    expect(() => app.registerModule(ModuleA)).toThrowError(
      /Circular module dependency detected/,
    );
  });
});

