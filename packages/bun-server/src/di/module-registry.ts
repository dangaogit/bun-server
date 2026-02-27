import { ControllerRegistry } from '../controller/controller';
import { Container } from './container';
import { Lifecycle } from './types';
import { getModuleMetadata, type ModuleClass, type ModuleProvider, type ProviderToken } from './module';
import { isGlobalModule } from './decorators';
import type { Constructor } from '@/core/types';
import type { ApplicationExtension } from '../extensions/types';
import type { Middleware } from '../middleware';
import {
  callOnModuleInit,
  callOnModuleDestroy,
  callOnApplicationBootstrap,
  callOnApplicationShutdown,
} from './lifecycle';

interface ModuleRef {
  moduleClass: ModuleClass;
  metadata: ReturnType<typeof getModuleMetadata>;
  container: Container;
  controllersRegistered: boolean;
  attachedParents: Set<Container>;
  extensions: ApplicationExtension[];
  middlewares: Middleware[];
  /**
   * 是否为全局模块
   */
  isGlobal: boolean;
}

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private readonly moduleRefs = new Map<ModuleClass, ModuleRef>();
  private readonly processing = new Set<ModuleClass>();
  private rootContainer?: Container;
  /**
   * 存储全局模块列表，用于在其他模块注册时自动附加全局 exports
   */
  private readonly globalModules = new Set<ModuleClass>();

  public static getInstance(): ModuleRegistry {
    if (!ModuleRegistry.instance) {
      ModuleRegistry.instance = new ModuleRegistry();
    }
    return ModuleRegistry.instance;
  }

  public register(moduleClass: ModuleClass, parentContainer: Container): ModuleRef {
    if (!this.rootContainer) {
      this.rootContainer = parentContainer;
    }
    return this.processModule(moduleClass, parentContainer);
  }

  public getModuleRef(moduleClass: ModuleClass): ModuleRef | undefined {
    return this.moduleRefs.get(moduleClass);
  }

  /**
   * 获取所有模块的子容器（用于异步 provider 初始化）
   */
  public getAllModuleContainers(): Container[] {
    const containers: Container[] = [];
    for (const [, ref] of this.moduleRefs) {
      containers.push(ref.container);
    }
    return containers;
  }

  public clear(): void {
    this.moduleRefs.clear();
    this.processing.clear();
    this.globalModules.clear();
    this.rootContainer = undefined;
  }

  /**
   * 获取所有全局模块
   */
  public getGlobalModules(): ModuleClass[] {
    return Array.from(this.globalModules);
  }

  private processModule(moduleClass: ModuleClass, parentContainer: Container): ModuleRef {
    if (this.processing.has(moduleClass)) {
      throw new Error(`Circular module dependency detected for ${moduleClass.name}`);
    }
    const moduleRef = this.getOrCreateModuleRef(moduleClass);
    this.processing.add(moduleClass);
    for (const imported of moduleRef.metadata.imports) {
      this.processModule(imported, moduleRef.container);
    }
    this.processing.delete(moduleClass);
    this.attachModuleToParent(moduleRef, parentContainer);
    return moduleRef;
  }

  private getOrCreateModuleRef(moduleClass: ModuleClass): ModuleRef {
    let ref = this.moduleRefs.get(moduleClass);
    if (ref) {
      return ref;
    }
    if (!this.rootContainer) {
      throw new Error('ModuleRegistry is not initialized with a root container');
    }
    const metadata = getModuleMetadata(moduleClass);
    const isGlobal = isGlobalModule(moduleClass);
    const container = new Container({ parent: this.rootContainer });
    this.registerProviders(container, metadata.providers);
    ref = {
      moduleClass,
      metadata,
      container,
      controllersRegistered: false,
      attachedParents: new Set<Container>(),
      extensions: metadata.extensions ?? [],
      middlewares: metadata.middlewares ?? [],
      isGlobal,
    };
    this.registerControllers(ref);
    this.moduleRefs.set(moduleClass, ref);

    // 如果是全局模块，注册到根容器并记录
    if (isGlobal) {
      this.globalModules.add(moduleClass);
      this.registerGlobalExports(ref);
    }

    return ref;
  }

  /**
   * 将全局模块的 exports 注册到根容器
   * 这样所有模块都可以访问全局模块导出的提供者
   */
  private registerGlobalExports(moduleRef: ModuleRef): void {
    if (!this.rootContainer) {
      return;
    }
    for (const exportedToken of moduleRef.metadata.exports) {
      this.registerExport(this.rootContainer, moduleRef, exportedToken);
    }
  }

  private registerProviders(container: Container, providers: ModuleProvider[]): void {
    for (const provider of providers) {
      if (typeof provider === 'function') {
        if (!container.isRegistered(provider)) {
          container.register(provider);
        }
        continue;
      }

      if ('useValue' in provider) {
        container.registerInstance(provider.provide, provider.useValue);
        continue;
      }

      if ('useFactory' in provider) {
        container.register(provider.provide, {
          lifecycle: provider.lifecycle ?? Lifecycle.Singleton,
          factory: () => provider.useFactory(container),
        });
        continue;
      }

      if ('useClass' in provider) {
        const token = provider.provide ?? provider.useClass;
        container.register(token, {
          lifecycle: provider.lifecycle ?? Lifecycle.Singleton,
          implementation: provider.useClass,
        });
      }
    }
  }

  private registerControllers(moduleRef: ModuleRef): void {
    if (moduleRef.controllersRegistered) {
      return;
    }
    const controllerRegistry = ControllerRegistry.getInstance();
    for (const controller of moduleRef.metadata.controllers) {
      controllerRegistry.register(controller, moduleRef.container);
    }
    moduleRef.controllersRegistered = true;
  }

  private attachModuleToParent(moduleRef: ModuleRef, parentContainer: Container): void {
    if (moduleRef.attachedParents.has(parentContainer)) {
      return;
    }
    moduleRef.attachedParents.add(parentContainer);
    for (const exportedToken of moduleRef.metadata.exports) {
      this.registerExport(parentContainer, moduleRef, exportedToken);
    }
    // 收集导入模块的扩展和中间件
    for (const imported of moduleRef.metadata.imports) {
      const importedRef = this.moduleRefs.get(imported);
      if (importedRef) {
        moduleRef.extensions.push(...importedRef.extensions);
        moduleRef.middlewares.push(...importedRef.middlewares);
      }
    }
  }

  /**
   * 获取模块的所有扩展（包括导入模块的扩展）
   */
  public getModuleExtensions(moduleClass: ModuleClass): ApplicationExtension[] {
    const moduleRef = this.moduleRefs.get(moduleClass);
    if (!moduleRef) {
      return [];
    }
    return moduleRef.extensions;
  }

  /**
   * 获取模块的所有中间件（包括导入模块的中间件）
   */
  public getModuleMiddlewares(moduleClass: ModuleClass): Middleware[] {
    const moduleRef = this.moduleRefs.get(moduleClass);
    if (!moduleRef) {
      return [];
    }
    return moduleRef.middlewares;
  }

  /**
   * 解析所有模块中的 provider 实例，用于生命周期钩子调用
   */
  public resolveAllProviderInstances(): unknown[] {
    const instances: unknown[] = [];
    for (const [, ref] of this.moduleRefs) {
      for (const provider of ref.metadata.providers) {
        try {
          if (typeof provider === 'function') {
            instances.push(ref.container.resolve(provider));
          } else if ('useClass' in provider) {
            const token = provider.provide ?? provider.useClass;
            instances.push(ref.container.resolve(token as Constructor<unknown>));
          } else if ('useValue' in provider) {
            instances.push(provider.useValue);
          } else if ('useFactory' in provider) {
            instances.push(ref.container.resolve(provider.provide as Constructor<unknown>));
          }
        } catch {
          // skip providers that can't be resolved (e.g. pending async providers)
        }
      }
    }
    return instances;
  }

  /**
   * 调用所有 provider 的 onModuleInit 钩子
   */
  public async callModuleInitHooks(): Promise<void> {
    const instances = this.resolveAllProviderInstances();
    await callOnModuleInit(instances);
  }

  /**
   * 调用所有 provider 的 onApplicationBootstrap 钩子
   */
  public async callBootstrapHooks(): Promise<void> {
    const instances = this.resolveAllProviderInstances();
    await callOnApplicationBootstrap(instances);
  }

  /**
   * 调用所有 provider 的 onModuleDestroy 钩子
   */
  public async callModuleDestroyHooks(): Promise<void> {
    const instances = this.resolveAllProviderInstances();
    await callOnModuleDestroy(instances);
  }

  /**
   * 调用所有 provider 的 onApplicationShutdown 钩子
   */
  public async callShutdownHooks(signal?: string): Promise<void> {
    const instances = this.resolveAllProviderInstances();
    await callOnApplicationShutdown(instances, signal);
  }

  private registerExport(parentContainer: Container, moduleRef: ModuleRef, token: ProviderToken): void {
    if (!moduleRef.container.isRegistered(token)) {
      throw new Error(
        `Module ${moduleRef.moduleClass.name} cannot export ${
          typeof token === 'function' ? token.name : String(token)
        } because it is not registered`,
      );
    }
    if (parentContainer.isRegistered(token)) {
      return;
    }
    parentContainer.register(token as Constructor<unknown>, {
      lifecycle: Lifecycle.Singleton,
      factory: () => moduleRef.container.resolve(token as any),
    });
  }
}

