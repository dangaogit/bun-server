import { Module, MODULE_METADATA_KEY, type ModuleProvider } from '../di/module';

import { QueueService } from './service';
import {
  QUEUE_OPTIONS_TOKEN,
  QUEUE_SERVICE_TOKEN,
  MemoryQueueStore,
  type QueueModuleOptions,
  type QueueStore,
} from './types';

@Module({
  providers: [],
})
export class QueueModule {
  /**
   * 创建队列模块
   * @param options - 模块配置
   */
  public static forRoot(
    options: QueueModuleOptions = {},
  ): typeof QueueModule {
    const providers: ModuleProvider[] = [];

    // 如果没有提供 store，使用默认的内存存储
    const store: QueueStore = options.store ?? new MemoryQueueStore();

    const service = new QueueService({
      store,
      defaultQueue: options.defaultQueue,
      enableWorker: options.enableWorker,
      concurrency: options.concurrency,
    });

    providers.push(
      {
        provide: QUEUE_SERVICE_TOKEN,
        useValue: service,
      },
      {
        provide: QueueService,
        useValue: service,
      },
      {
        provide: QUEUE_OPTIONS_TOKEN,
        useValue: options,
      },
    );

    // 动态更新模块元数据
    const existingMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, QueueModule) || {};
    const metadata = {
      ...existingMetadata,
      providers: [...(existingMetadata.providers || []), ...providers],
      exports: [
        ...(existingMetadata.exports || []),
        QUEUE_SERVICE_TOKEN,
        QUEUE_OPTIONS_TOKEN,
        QueueService,
      ],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, QueueModule);

    return QueueModule;
  }
}
