import type { ModuleClass, ModuleProvider, ProviderToken } from './module';
import { MODULE_METADATA_KEY } from './module';
import type { Container } from './container';

/**
 * 异步模块配置选项
 */
export interface AsyncModuleOptions<T> {
  /**
   * 需要导入的模块（提供 inject 依赖的来源）
   */
  imports?: ModuleClass[];
  /**
   * 要注入到 useFactory 中的 provider tokens
   */
  inject?: ProviderToken[];
  /**
   * 异步工厂函数，返回模块配置
   */
  useFactory: (...deps: unknown[]) => T | Promise<T>;
}

/**
 * 异步 provider 注册表
 * 在 Application.listen() 期间，所有待初始化的异步 provider 将被顺序执行
 */
export class AsyncProviderRegistry {
  private static instance: AsyncProviderRegistry;
  private readonly pendingFactories: Array<{
    token: ProviderToken;
    factory: (container: Container) => Promise<unknown>;
  }> = [];

  public static getInstance(): AsyncProviderRegistry {
    if (!AsyncProviderRegistry.instance) {
      AsyncProviderRegistry.instance = new AsyncProviderRegistry();
    }
    return AsyncProviderRegistry.instance;
  }

  /**
   * 注册一个异步 provider
   */
  public register(
    token: ProviderToken,
    factory: (container: Container) => Promise<unknown>,
  ): void {
    this.pendingFactories.push({ token, factory });
  }

  /**
   * 初始化所有异步 providers
   * @param container - 根 DI 容器
   */
  public async initializeAll(container: Container): Promise<void> {
    for (const { token, factory } of this.pendingFactories) {
      const value = await factory(container);
      container.registerInstance(token, value);
    }
    this.pendingFactories.length = 0;
  }

  /**
   * 检查是否有待初始化的异步 providers
   */
  public hasPending(): boolean {
    return this.pendingFactories.length > 0;
  }

  public clear(): void {
    this.pendingFactories.length = 0;
  }
}

/**
 * 辅助函数：为模块添加 forRootAsync 的标准实现
 * 各模块可直接在 forRootAsync 中调用此函数
 */
export function registerAsyncProviders<T>(
  moduleClass: ModuleClass,
  asyncOptions: AsyncModuleOptions<T>,
  tokenMap: Map<ProviderToken, (config: T) => unknown>,
  extraProviders?: ModuleProvider[],
): typeof moduleClass {
  const providers: ModuleProvider[] = [];
  const exports: ProviderToken[] = [];

  for (const [token] of tokenMap) {
    // Placeholder factory that will be resolved async during init
    providers.push({
      provide: token,
      useFactory: () => {
        throw new Error(
          `Async provider ${String(token)} not yet initialized. ` +
          'Ensure Application.listen() is called before resolving async providers.',
        );
      },
    });
    exports.push(token);
  }

  if (extraProviders) {
    providers.push(...extraProviders);
  }

  // Register the async factory
  const registry = AsyncProviderRegistry.getInstance();
  for (const [token, mapper] of tokenMap) {
    registry.register(token, async (container) => {
      const deps: unknown[] = [];
      if (asyncOptions.inject) {
        for (const injectToken of asyncOptions.inject) {
          deps.push(container.resolve(injectToken as any));
        }
      }
      const config = await asyncOptions.useFactory(...deps);
      return mapper(config);
    });
  }

  const existingMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, moduleClass) || {};
  const metadata = {
    ...existingMetadata,
    imports: [...(existingMetadata.imports || []), ...(asyncOptions.imports || [])],
    providers: [...(existingMetadata.providers || []), ...providers],
    exports: [...(existingMetadata.exports || []), ...exports],
  };
  Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, moduleClass);

  return moduleClass;
}
