import { ControllerRegistry } from '../controller/controller';
import { Container } from './container';
import { Lifecycle } from './types';
import { getModuleMetadata, type ModuleClass, type ModuleProvider, type ProviderToken } from './module';
import type { Constructor } from '@/core/types';
import type { ApplicationExtension } from '../extensions/types';
import type { Middleware } from '../middleware';

interface ModuleRef {
  moduleClass: ModuleClass;
  metadata: ReturnType<typeof getModuleMetadata>;
  container: Container;
  controllersRegistered: boolean;
  attachedParents: Set<Container>;
  extensions: ApplicationExtension[];
  middlewares: Middleware[];
}

export class ModuleRegistry {
  private static instance: ModuleRegistry;
  private readonly moduleRefs = new Map<ModuleClass, ModuleRef>();
  private readonly processing = new Set<ModuleClass>();
  private rootContainer?: Container;

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

  public clear(): void {
    this.moduleRefs.clear();
    this.processing.clear();
    this.rootContainer = undefined;
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
    };
    this.registerControllers(ref);
    this.moduleRefs.set(moduleClass, ref);
    return ref;
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

