import { beforeEach, afterEach, describe, expect, test } from 'bun:test';

import { Application } from '../../src/core/application';
import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { GET } from '../../src/router/decorators';
import { Module } from '../../src/di/module';
import { ModuleRegistry } from '../../src/di/module-registry';
import { RouteRegistry } from '../../src/router/registry';
import { Injectable, Inject, Global, isGlobalModule, GLOBAL_MODULE_METADATA_KEY } from '../../src/di/decorators';
import { Context } from '../../src/core/context';

describe('Global Module', () => {
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

  describe('@Global() decorator', () => {
    test('should mark module as global', () => {
      @Global()
      @Module({
        providers: [],
      })
      class GlobalModule {}

      expect(isGlobalModule(GlobalModule)).toBe(true);
    });

    test('should return false for non-global modules', () => {
      @Module({
        providers: [],
      })
      class RegularModule {}

      expect(isGlobalModule(RegularModule)).toBe(false);
    });

    test('should set global metadata key', () => {
      @Global()
      @Module({
        providers: [],
      })
      class GlobalModule {}

      const metadata = Reflect.getMetadata(GLOBAL_MODULE_METADATA_KEY, GlobalModule);
      expect(metadata).toBe(true);
    });
  });

  describe('Global module exports', () => {
    test('should allow accessing global module exports without explicit import', () => {
      // 创建全局配置服务
      const CONFIG_TOKEN = Symbol('config');

      @Injectable()
      class GlobalConfigService {
        public readonly appName = 'TestApp';

        public get(key: string): string {
          return `config:${key}`;
        }
      }

      @Global()
      @Module({
        providers: [
          {
            provide: CONFIG_TOKEN,
            useClass: GlobalConfigService,
          },
        ],
        exports: [CONFIG_TOKEN],
      })
      class GlobalConfigModule {}

      // 创建一个使用全局服务的用户服务
      @Injectable()
      class UserService {
        public constructor(@Inject(CONFIG_TOKEN) private readonly config: GlobalConfigService) {}

        public getConfigValue(): string {
          return this.config.get('user.prefix');
        }
      }

      @Controller('/users')
      class UserController {
        public constructor(@Inject(UserService) private readonly userService: UserService) {}

        @GET('/config')
        public getConfig(): string {
          return this.userService.getConfigValue();
        }
      }

      // 用户模块不需要导入 GlobalConfigModule
      @Module({
        controllers: [UserController],
        providers: [UserService],
      })
      class UserModule {}

      // 注册模块
      const app = new Application();
      app.registerModule(GlobalConfigModule);
      app.registerModule(UserModule);

      // 验证全局模块被正确识别
      const registry = ModuleRegistry.getInstance();
      const globalModules = registry.getGlobalModules();
      expect(globalModules).toContain(GlobalConfigModule);

      // 验证用户模块可以解析全局提供者
      const userModuleRef = registry.getModuleRef(UserModule);
      expect(userModuleRef).toBeDefined();

      // 通过父容器（根容器）解析全局服务
      const userService = userModuleRef!.container.resolve(UserService);
      expect(userService.getConfigValue()).toBe('config:user.prefix');
    });

    test('should share singleton instance across modules for global exports', () => {
      const SHARED_TOKEN = Symbol('shared');

      @Injectable()
      class SharedService {
        public readonly instanceId = Math.random();
      }

      @Global()
      @Module({
        providers: [
          {
            provide: SHARED_TOKEN,
            useClass: SharedService,
          },
        ],
        exports: [SHARED_TOKEN],
      })
      class SharedGlobalModule {}

      @Injectable()
      class ServiceA {
        public constructor(@Inject(SHARED_TOKEN) public readonly shared: SharedService) {}
      }

      @Injectable()
      class ServiceB {
        public constructor(@Inject(SHARED_TOKEN) public readonly shared: SharedService) {}
      }

      @Module({
        providers: [ServiceA],
      })
      class ModuleA {}

      @Module({
        providers: [ServiceB],
      })
      class ModuleB {}

      const app = new Application();
      app.registerModule(SharedGlobalModule);
      app.registerModule(ModuleA);
      app.registerModule(ModuleB);

      const registry = ModuleRegistry.getInstance();
      const moduleARef = registry.getModuleRef(ModuleA);
      const moduleBRef = registry.getModuleRef(ModuleB);

      const serviceA = moduleARef!.container.resolve(ServiceA);
      const serviceB = moduleBRef!.container.resolve(ServiceB);

      // 验证两个服务使用的是同一个共享实例
      expect(serviceA.shared.instanceId).toBe(serviceB.shared.instanceId);
    });

    test('should work with class-based exports in global modules', () => {
      @Injectable()
      class LoggerService {
        public log(message: string): string {
          return `[LOG] ${message}`;
        }
      }

      @Global()
      @Module({
        providers: [LoggerService],
        exports: [LoggerService],
      })
      class LoggerGlobalModule {}

      @Injectable()
      class UserService {
        public constructor(@Inject(LoggerService) private readonly logger: LoggerService) {}

        public createUser(name: string): string {
          return this.logger.log(`User created: ${name}`);
        }
      }

      @Module({
        providers: [UserService],
      })
      class UserModule {}

      const app = new Application();
      app.registerModule(LoggerGlobalModule);
      app.registerModule(UserModule);

      const registry = ModuleRegistry.getInstance();
      const userModuleRef = registry.getModuleRef(UserModule);
      const userService = userModuleRef!.container.resolve(UserService);

      expect(userService.createUser('Alice')).toBe('[LOG] User created: Alice');
    });

    test('should not affect non-global module behavior', () => {
      @Injectable()
      class LocalService {
        public getValue(): string {
          return 'local';
        }
      }

      // 非全局模块
      @Module({
        providers: [LocalService],
        exports: [LocalService],
      })
      class LocalModule {}

      @Injectable()
      class ConsumerService {
        public constructor(@Inject(LocalService) private readonly local: LocalService) {}

        public consume(): string {
          return this.local.getValue();
        }
      }

      // 必须显式导入 LocalModule 才能使用 LocalService
      @Module({
        imports: [LocalModule],
        providers: [ConsumerService],
      })
      class ConsumerModule {}

      const app = new Application();
      app.registerModule(ConsumerModule);

      const registry = ModuleRegistry.getInstance();
      const consumerRef = registry.getModuleRef(ConsumerModule);
      const consumerService = consumerRef!.container.resolve(ConsumerService);

      expect(consumerService.consume()).toBe('local');
    });

    test('should require explicit import for non-global module exports when modules are isolated', () => {
      // 这个测试验证非全局模块的 exports 不会自动暴露给其他模块
      // 除非显式导入

      @Injectable()
      class IsolatedService {
        public getValue(): string {
          return 'isolated';
        }
      }

      // 非全局模块
      @Module({
        providers: [IsolatedService],
        exports: [IsolatedService],
      })
      class IsolatedModule {}

      @Injectable()
      class ConsumerServiceWithImport {
        public constructor(@Inject(IsolatedService) private readonly isolated: IsolatedService) {}

        public consume(): string {
          return this.isolated.getValue();
        }
      }

      // 导入 IsolatedModule 才能使用 IsolatedService
      @Module({
        imports: [IsolatedModule],
        providers: [ConsumerServiceWithImport],
      })
      class ConsumerModuleWithImport {}

      const app = new Application();
      app.registerModule(ConsumerModuleWithImport);

      const registry = ModuleRegistry.getInstance();

      // 验证非全局模块不在全局模块列表中
      const globalModules = registry.getGlobalModules();
      expect(globalModules).not.toContain(IsolatedModule);

      // 但通过显式导入后可以正常使用
      const consumerRef = registry.getModuleRef(ConsumerModuleWithImport);
      const consumerService = consumerRef!.container.resolve(ConsumerServiceWithImport);
      expect(consumerService.consume()).toBe('isolated');
    });
  });

  describe('Multiple global modules', () => {
    test('should support multiple global modules', () => {
      const CONFIG_TOKEN = Symbol('config');
      const LOGGER_TOKEN = Symbol('logger');

      @Injectable()
      class ConfigService {
        public get(key: string): string {
          return `config:${key}`;
        }
      }

      @Injectable()
      class LoggerService {
        public log(msg: string): string {
          return `[LOG] ${msg}`;
        }
      }

      @Global()
      @Module({
        providers: [{ provide: CONFIG_TOKEN, useClass: ConfigService }],
        exports: [CONFIG_TOKEN],
      })
      class ConfigGlobalModule {}

      @Global()
      @Module({
        providers: [{ provide: LOGGER_TOKEN, useClass: LoggerService }],
        exports: [LOGGER_TOKEN],
      })
      class LoggerGlobalModule {}

      @Injectable()
      class AppService {
        public constructor(
          @Inject(CONFIG_TOKEN) private readonly config: ConfigService,
          @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
        ) {}

        public run(): string {
          const configValue = this.config.get('app.name');
          return this.logger.log(configValue);
        }
      }

      @Module({
        providers: [AppService],
      })
      class AppModule {}

      const app = new Application();
      app.registerModule(ConfigGlobalModule);
      app.registerModule(LoggerGlobalModule);
      app.registerModule(AppModule);

      const registry = ModuleRegistry.getInstance();
      const globalModules = registry.getGlobalModules();
      expect(globalModules).toHaveLength(2);
      expect(globalModules).toContain(ConfigGlobalModule);
      expect(globalModules).toContain(LoggerGlobalModule);

      const appRef = registry.getModuleRef(AppModule);
      const appService = appRef!.container.resolve(AppService);
      expect(appService.run()).toBe('[LOG] config:app.name');
    });
  });

  describe('Global module with controllers', () => {
    test('should register controllers from global modules', async () => {
      @Injectable()
      class StatusService {
        public getStatus(): string {
          return 'OK';
        }
      }

      @Controller('/status')
      class StatusController {
        public constructor(@Inject(StatusService) private readonly statusService: StatusService) {}

        @GET('/')
        public getStatus(): string {
          return this.statusService.getStatus();
        }
      }

      @Global()
      @Module({
        controllers: [StatusController],
        providers: [StatusService],
        exports: [StatusService],
      })
      class StatusGlobalModule {}

      const app = new Application();
      app.registerModule(StatusGlobalModule);

      // 验证控制器被正确注册
      const router = RouteRegistry.getInstance().getRouter();
      const context = new Context(new Request('http://localhost/status'));
      const response = await router.handle(context);
      expect(await response?.text()).toBe('OK');
    });
  });

  describe('Global module integration with forRoot pattern', () => {
    test('should work with forRoot pattern in global modules', () => {
      const DB_TOKEN = Symbol('database');

      interface DatabaseConfig {
        host: string;
        port: number;
      }

      @Injectable()
      class DatabaseService {
        public constructor(public readonly config: DatabaseConfig) {}

        public getConnectionString(): string {
          return `${this.config.host}:${this.config.port}`;
        }
      }

      @Global()
      @Module({})
      class DatabaseGlobalModule {
        public static forRoot(config: DatabaseConfig): typeof DatabaseGlobalModule {
          Module({
            providers: [
              {
                provide: DB_TOKEN,
                useFactory: () => new DatabaseService(config),
              },
            ],
            exports: [DB_TOKEN],
          })(DatabaseGlobalModule);
          return DatabaseGlobalModule;
        }
      }

      @Injectable()
      class UserRepository {
        public constructor(@Inject(DB_TOKEN) private readonly db: DatabaseService) {}

        public getDbInfo(): string {
          return this.db.getConnectionString();
        }
      }

      @Module({
        providers: [UserRepository],
      })
      class UserModule {}

      // 使用 forRoot 配置全局数据库模块
      DatabaseGlobalModule.forRoot({ host: 'localhost', port: 5432 });

      const app = new Application();
      app.registerModule(DatabaseGlobalModule);
      app.registerModule(UserModule);

      const registry = ModuleRegistry.getInstance();
      const userRef = registry.getModuleRef(UserModule);
      const userRepo = userRef!.container.resolve(UserRepository);

      expect(userRepo.getDbInfo()).toBe('localhost:5432');
    });
  });
});
