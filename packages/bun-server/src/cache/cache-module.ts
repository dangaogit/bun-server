import { Module, MODULE_METADATA_KEY, type ModuleProvider } from '../di/module';

import { CacheService } from './service';
import {
  CACHE_OPTIONS_TOKEN,
  CACHE_SERVICE_TOKEN,
  MemoryCacheStore,
  type CacheModuleOptions,
  type CacheStore,
} from './types';
import { CachePostProcessor } from './service-proxy';

/**
 * 缓存后处理器 Token
 */
export const CACHE_POST_PROCESSOR_TOKEN = Symbol('@dangao/bun-server:cache:post-processor');

@Module({
  providers: [],
})
export class CacheModule {
  /**
   * 缓存后处理器实例（单例）
   */
  private static postProcessor: CachePostProcessor | null = null;

  /**
   * 创建缓存模块
   * @param options - 模块配置
   */
  public static forRoot(
    options: CacheModuleOptions = {},
  ): typeof CacheModule {
    const providers: ModuleProvider[] = [];

    // 如果没有提供 store，使用默认的内存存储
    const store: CacheStore =
      options.store ??
      new MemoryCacheStore({
        cleanupInterval: 60000, // 每分钟清理一次
      });

    const service = new CacheService({
      store,
      defaultTtl: options.defaultTtl,
      keyPrefix: options.keyPrefix,
    });

    // 创建缓存后处理器（单例）
    if (!CacheModule.postProcessor) {
      CacheModule.postProcessor = new CachePostProcessor();
    }

    providers.push(
      {
        provide: CACHE_SERVICE_TOKEN,
        useValue: service,
      },
      {
        provide: CACHE_OPTIONS_TOKEN,
        useValue: options,
      },
      {
        provide: CACHE_POST_PROCESSOR_TOKEN,
        useValue: CacheModule.postProcessor,
      },
      CacheService,
    );

    // 动态更新模块元数据
    const existingMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, CacheModule) || {};
    const metadata = {
      ...existingMetadata,
      providers: [...(existingMetadata.providers || []), ...providers],
      exports: [
        ...(existingMetadata.exports || []),
        CACHE_SERVICE_TOKEN,
        CACHE_OPTIONS_TOKEN,
        CACHE_POST_PROCESSOR_TOKEN,
        CacheService,
      ],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, CacheModule);

    return CacheModule;
  }

  /**
   * 获取缓存后处理器
   * 用于在应用启动时注册到 DI 容器
   */
  public static getPostProcessor(): CachePostProcessor | null {
    return CacheModule.postProcessor;
  }

  /**
   * 重置模块状态（主要用于测试）
   */
  public static reset(): void {
    CacheModule.postProcessor = null;
    Reflect.deleteMetadata(MODULE_METADATA_KEY, CacheModule);
  }
}
