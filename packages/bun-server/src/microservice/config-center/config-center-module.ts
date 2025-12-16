import { Module, MODULE_METADATA_KEY, type ModuleProvider } from '../../di/module';
import { NacosClient } from '@dangao/nacos-client';
import type { NacosClientOptions } from '@dangao/nacos-client';
import { NacosConfigCenter } from './nacos-config-center';
import { CONFIG_CENTER_TOKEN, type ConfigCenter } from './types';

/**
 * 配置中心 Provider 类型
 */
export type ConfigCenterProvider = 'nacos' | 'consul' | 'etcd' | 'apollo';

/**
 * Nacos 配置中心选项
 */
export interface NacosConfigCenterOptions {
  /**
   * Nacos 客户端配置
   */
  client: NacosClientOptions;

  /**
   * 配置监听轮询间隔（毫秒）
   * @default 3000
   */
  watchInterval?: number;
}

/**
 * 配置中心模块选项
 */
export interface ConfigCenterModuleOptions {
  /**
   * Provider 类型
   */
  provider: ConfigCenterProvider;

  /**
   * Nacos 配置（当 provider 为 'nacos' 时使用）
   */
  nacos?: NacosConfigCenterOptions;

  // 未来可以添加其他 provider 的配置
  // consul?: ConsulConfigCenterOptions;
  // etcd?: EtcdConfigCenterOptions;
}

/**
 * 配置中心模块
 */
@Module({
  providers: [],
})
export class ConfigCenterModule {
  /**
   * 创建配置中心模块
   * @param options - 模块配置
   */
  public static forRoot(options: ConfigCenterModuleOptions): typeof ConfigCenterModule {
    const providers: ModuleProvider[] = [];

    let configCenter: ConfigCenter;

    switch (options.provider) {
      case 'nacos':
        if (!options.nacos) {
          throw new Error('Nacos configuration is required when provider is "nacos"');
        }

        const nacosClient = new NacosClient(options.nacos.client);
        configCenter = new NacosConfigCenter(nacosClient, {
          watchInterval: options.nacos.watchInterval,
        });
        break;

      default:
        throw new Error(`Unsupported config center provider: ${options.provider}`);
    }

    providers.push({
      provide: CONFIG_CENTER_TOKEN,
      useValue: configCenter,
    });

    const existingMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigCenterModule) || {};
    const metadata = {
      ...existingMetadata,
      providers: [...(existingMetadata.providers || []), ...providers],
      exports: [
        ...(existingMetadata.exports || []),
        CONFIG_CENTER_TOKEN,
      ],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, ConfigCenterModule);

    return ConfigCenterModule;
  }
}

