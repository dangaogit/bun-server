import { beforeEach, afterEach, describe, expect, test } from 'bun:test';

import { Application } from '../../src/core/application';
import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { GET } from '../../src/router/decorators';
import { Module } from '../../src/di/module';
import { ModuleRegistry } from '../../src/di/module-registry';
import { Container } from '../../src/di/container';
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

  test('FactoryProvider inject passes resolved dependencies to useFactory', () => {
    const TOKEN = Symbol.for('test.factory.inject.basic');

    @Injectable()
    class Dep {
      public greet(): string {
        return 'hello';
      }
    }

    @Module({
      providers: [
        Dep,
        {
          provide: TOKEN,
          useFactory: (dep: Dep) => ({
            dep,
            message: dep.greet(),
          }),
          inject: [Dep],
        },
      ],
    })
    class TestModule {}

    const app = new Application();
    app.registerModule(TestModule);

    const ref = ModuleRegistry.getInstance().getModuleRef(TestModule)!;
    const dep = ref.container.resolve(Dep);
    const result = ref.container.resolve<{ dep: Dep; message: string }>(TOKEN);

    expect(result.dep).toBe(dep);
    expect(result.message).toBe('hello');
  });

  test('FactoryProvider without inject or with empty inject still passes Container to useFactory', () => {
    const TOKEN = Symbol.for('test.factory.inject.compat');
    const EMPTY_INJECT_TOKEN = Symbol.for('test.factory.inject.compat.empty');

    @Injectable()
    class Dep {
      public readonly value = 'manual';
    }

    @Module({
      providers: [
        Dep,
        {
          provide: TOKEN,
          useFactory: (container: Container) => ({
            isContainer: container instanceof Container,
            dep: container.resolve(Dep),
          }),
        },
        {
          provide: EMPTY_INJECT_TOKEN,
          useFactory: (container: Container) => ({
            isContainer: container instanceof Container,
            dep: container.resolve(Dep),
          }),
          inject: [],
        },
      ],
    })
    class TestModule {}

    const app = new Application();
    app.registerModule(TestModule);

    const ref = ModuleRegistry.getInstance().getModuleRef(TestModule)!;
    const dep = ref.container.resolve(Dep);
    const result = ref.container.resolve<{ isContainer: boolean; dep: Dep }>(TOKEN);
    const emptyInjectResult = ref.container.resolve<{ isContainer: boolean; dep: Dep }>(
      EMPTY_INJECT_TOKEN,
    );

    expect(result.isContainer).toBe(true);
    expect(result.dep).toBe(dep);
    expect(emptyInjectResult.isContainer).toBe(true);
    expect(emptyInjectResult.dep).toBe(dep);
  });

  test('FactoryProvider inject resolves tokens exported from imported modules', () => {
    const DEP_TOKEN = Symbol.for('test.factory.inject.exported.dep');
    const TOKEN = Symbol.for('test.factory.inject.exported.result');

    interface DepContract {
      label(): string;
    }

    const exportedDep: DepContract = {
      label: () => 'from-export',
    };

    @Module({
      providers: [{ provide: DEP_TOKEN, useValue: exportedDep }],
      exports: [DEP_TOKEN],
    })
    class SharedModule {}

    @Module({
      imports: [SharedModule],
      providers: [
        {
          provide: TOKEN,
          useFactory: (dep: DepContract) => ({
            dep,
            label: dep.label(),
          }),
          inject: [DEP_TOKEN],
        },
      ],
    })
    class AppModule {}

    const app = new Application();
    app.registerModule(AppModule);

    const ref = ModuleRegistry.getInstance().getModuleRef(AppModule)!;
    const result = ref.container.resolve<{ dep: DepContract; label: string }>(TOKEN);

    expect(result.dep).toBe(exportedDep);
    expect(result.label).toBe('from-export');
  });

  test('FactoryProvider inject preserves token order for factory arguments', () => {
    const FIRST = Symbol.for('test.factory.inject.order.first');
    const SECOND = Symbol.for('test.factory.inject.order.second');
    const TOKEN = Symbol.for('test.factory.inject.order.result');

    @Module({
      providers: [
        { provide: FIRST, useValue: 'first' },
        { provide: SECOND, useValue: 'second' },
        {
          provide: TOKEN,
          useFactory: (second: string, first: string) => [second, first],
          inject: [SECOND, FIRST],
        },
      ],
    })
    class TestModule {}

    const app = new Application();
    app.registerModule(TestModule);

    const ref = ModuleRegistry.getInstance().getModuleRef(TestModule)!;
    const result = ref.container.resolve<string[]>(TOKEN);

    expect(result).toEqual(['second', 'first']);
  });

  test('FactoryProvider inject works when mixed with useExisting useValue and useClass providers', () => {
    const CLASS_TOKEN = Symbol.for('test.factory.inject.mix.class');
    const VALUE_TOKEN = Symbol.for('test.factory.inject.mix.value');
    const ALIAS_TOKEN = Symbol.for('test.factory.inject.mix.alias');
    const TOKEN = Symbol.for('test.factory.inject.mix.result');

    class Impl {
      public readonly kind = 'impl';
    }

    const value = { kind: 'value' };

    @Module({
      providers: [
        { provide: CLASS_TOKEN, useClass: Impl },
        { provide: VALUE_TOKEN, useValue: value },
        { provide: ALIAS_TOKEN, useExisting: CLASS_TOKEN },
        {
          provide: TOKEN,
          useFactory: (aliased: Impl, injectedValue: typeof value) => ({
            aliased,
            injectedValue,
          }),
          inject: [ALIAS_TOKEN, VALUE_TOKEN],
        },
      ],
    })
    class TestModule {}

    const app = new Application();
    app.registerModule(TestModule);

    const ref = ModuleRegistry.getInstance().getModuleRef(TestModule)!;
    const classInstance = ref.container.resolve<Impl>(CLASS_TOKEN);
    const aliasInstance = ref.container.resolve<Impl>(ALIAS_TOKEN);
    const valueInstance = ref.container.resolve<typeof value>(VALUE_TOKEN);
    const result = ref.container.resolve<{ aliased: Impl; injectedValue: typeof value }>(TOKEN);

    expect(classInstance).toBeInstanceOf(Impl);
    expect(aliasInstance).toBe(classInstance);
    expect(valueInstance).toBe(value);
    expect(result.aliased).toBe(classInstance);
    expect(result.injectedValue).toBe(value);
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
