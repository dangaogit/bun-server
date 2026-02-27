import 'reflect-metadata';

import { Application, type ApplicationOptions } from '../core/application';
import { Container } from '../di/container';
import { ModuleRegistry } from '../di/module-registry';
import { ControllerRegistry } from '../controller/controller';
import { RouteRegistry } from '../router/registry';
import { MODULE_METADATA_KEY, type ModuleMetadata, type ModuleClass, type ModuleProvider, type ProviderToken } from '../di/module';
import type { Constructor } from '../core/types';
import { TestHttpClient } from './test-client';

interface ProviderOverride {
  token: ProviderToken;
  useValue?: unknown;
  useClass?: Constructor<unknown>;
  useFactory?: () => unknown;
}

/**
 * 测试模块构建器
 * 提供流畅的 API 来创建测试用的隔离模块环境
 */
export class TestingModuleBuilder {
  private readonly metadata: ModuleMetadata;
  private readonly overrides: ProviderOverride[] = [];

  public constructor(metadata: ModuleMetadata) {
    this.metadata = { ...metadata };
  }

  /**
   * 覆盖指定 provider
   * @param token - 要覆盖的 provider token
   */
  public overrideProvider(token: ProviderToken): ProviderOverrideBuilder {
    return new ProviderOverrideBuilder(this, token);
  }

  /**
   * 编译测试模块，返回可用的 TestingModule 实例
   */
  public async compile(): Promise<TestingModule> {
    const providers = this.buildProviders();
    return new TestingModule(this.metadata, providers, this.overrides);
  }

  /** @internal */
  public addOverride(override: ProviderOverride): void {
    this.overrides.push(override);
  }

  private buildProviders(): ModuleProvider[] {
    const providers = [...(this.metadata.providers || [])];
    const overrideMap = new Map<string | symbol, ProviderOverride>();

    for (const override of this.overrides) {
      const key = typeof override.token === 'function'
        ? override.token.name
        : override.token;
      overrideMap.set(key as string | symbol, override);
    }

    const result: ModuleProvider[] = [];

    for (const provider of providers) {
      const token = typeof provider === 'function'
        ? provider.name
        : (provider as { provide?: ProviderToken }).provide;
      const key = typeof token === 'function' ? token.name : token;

      const override = overrideMap.get(key as string | symbol);
      if (override) {
        if (override.useValue !== undefined) {
          result.push({ provide: override.token, useValue: override.useValue });
        } else if (override.useClass) {
          result.push({ provide: override.token, useClass: override.useClass });
        } else if (override.useFactory) {
          result.push({ provide: override.token, useFactory: override.useFactory as (container: Container) => unknown });
        }
        overrideMap.delete(key as string | symbol);
      } else {
        result.push(provider);
      }
    }

    for (const override of overrideMap.values()) {
      if (override.useValue !== undefined) {
        result.push({ provide: override.token, useValue: override.useValue });
      }
    }

    return result;
  }
}

class ProviderOverrideBuilder {
  private readonly builder: TestingModuleBuilder;
  private readonly token: ProviderToken;

  public constructor(builder: TestingModuleBuilder, token: ProviderToken) {
    this.builder = builder;
    this.token = token;
  }

  /**
   * 使用固定值覆盖
   */
  public useValue(value: unknown): TestingModuleBuilder {
    this.builder.addOverride({ token: this.token, useValue: value });
    return this.builder;
  }

  /**
   * 使用替代类覆盖
   */
  public useClass(cls: Constructor<unknown>): TestingModuleBuilder {
    this.builder.addOverride({ token: this.token, useClass: cls });
    return this.builder;
  }

  /**
   * 使用工厂函数覆盖
   */
  public useFactory(factory: () => unknown): TestingModuleBuilder {
    this.builder.addOverride({ token: this.token, useFactory: factory });
    return this.builder;
  }
}

/**
 * 编译后的测试模块
 * 提供 DI 容器访问和 HTTP 测试客户端创建
 */
export class TestingModule {
  private readonly metadata: ModuleMetadata;
  private readonly providers: ModuleProvider[];
  private readonly overrides: ProviderOverride[];
  private app?: Application;
  private container?: Container;

  public constructor(
    metadata: ModuleMetadata,
    providers: ModuleProvider[],
    overrides: ProviderOverride[],
  ) {
    this.metadata = metadata;
    this.providers = providers;
    this.overrides = overrides;
  }

  /**
   * 从容器中获取 provider 实例
   */
  public get<T>(token: Constructor<T> | string | symbol): T {
    return this.getContainer().resolve<T>(token);
  }

  /**
   * 创建一个 Application 实例并注册所有 providers、controllers
   * @param options - 应用配置
   */
  public createApplication(options: ApplicationOptions = {}): Application {
    if (this.app) return this.app;

    this.app = new Application({
      enableSignalHandlers: false,
      ...options,
    });

    const container = this.app.getContainer();
    this.container = container;

    for (const provider of this.providers) {
      if (typeof provider === 'function') {
        container.register(provider);
      } else if ('useValue' in provider && provider.provide) {
        container.registerInstance(provider.provide, provider.useValue);
      } else if ('useFactory' in provider && provider.provide) {
        container.register(provider.provide as Constructor<unknown>, {
          factory: () => (provider as { useFactory: (container: Container) => unknown }).useFactory(container),
        });
      } else if ('useClass' in provider) {
        const token = (provider as { provide?: ProviderToken }).provide ?? (provider as { useClass: Constructor<unknown> }).useClass;
        container.register(token as Constructor<unknown>, {
          implementation: (provider as { useClass: Constructor<unknown> }).useClass,
        });
      }
    }

    if (this.metadata.imports) {
      for (const moduleClass of this.metadata.imports) {
        this.app.registerModule(moduleClass);
      }
    }

    if (this.metadata.controllers) {
      for (const ctrl of this.metadata.controllers) {
        this.app.registerController(ctrl);
      }
    }

    return this.app;
  }

  /**
   * 创建 HTTP 测试客户端
   * 自动启动应用，获取随机端口，返回 TestHttpClient
   */
  public async createHttpClient(options: ApplicationOptions = {}): Promise<TestHttpClient> {
    const app = this.createApplication(options);
    await app.listen(0);
    const server = app.getServer();
    const port = server?.getPort() ?? 3000;
    return new TestHttpClient(`http://localhost:${port}`, app);
  }

  /**
   * 获取 DI 容器
   */
  public getContainer(): Container {
    if (this.container) return this.container;
    this.createApplication();
    return this.container!;
  }
}

/**
 * 测试工具入口
 */
export class Test {
  /**
   * 创建测试模块
   * @param metadata - 模块元数据
   */
  public static createTestingModule(metadata: ModuleMetadata): TestingModuleBuilder {
    return new TestingModuleBuilder(metadata);
  }
}
