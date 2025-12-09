import { Module, MODULE_METADATA_KEY, type ModuleProvider } from '../di/module';

import { HealthController } from './controller';
import type { HealthIndicator, HealthModuleOptions } from './types';
import { HEALTH_INDICATORS_TOKEN, HEALTH_OPTIONS_TOKEN } from './types';

@Module({
  controllers: [HealthController],
  providers: [],
})
export class HealthModule {
  /**
   * 创建健康检查模块
   * @param options - 模块配置
   */
  public static forRoot(options: HealthModuleOptions = {}): typeof HealthModule {
    const providers: ModuleProvider[] = [];

    const indicators: HealthIndicator[] = options.indicators ?? [];

    providers.push(
      {
        provide: HEALTH_INDICATORS_TOKEN,
        useValue: indicators,
      },
      {
        provide: HEALTH_OPTIONS_TOKEN,
        useValue: options,
      },
    );

    // 动态更新模块元数据
    const existingMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, HealthModule) || {};
    const metadata = {
      ...existingMetadata,
      controllers: [...(existingMetadata.controllers || []), HealthController],
      providers: [...(existingMetadata.providers || []), ...providers],
      exports: [
        ...(existingMetadata.exports || []),
        HEALTH_INDICATORS_TOKEN,
        HEALTH_OPTIONS_TOKEN,
      ],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, HealthModule);

    return HealthModule;
  }
}


