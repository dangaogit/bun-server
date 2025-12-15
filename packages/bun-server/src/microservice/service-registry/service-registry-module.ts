import { Module, MODULE_METADATA_KEY, type ModuleProvider } from '../../di/module';
import { NacosClient } from '@dangao/nacos-client';
import type { NacosClientOptions } from '@dangao/nacos-client';
import { NacosServiceRegistry } from './nacos-service-registry';
import { SERVICE_REGISTRY_TOKEN, type ServiceRegistry } from './types';

/**
 * 服务注册中心 Provider 类型
 */
export type ServiceRegistryProvider = 'nacos' | 'consul' | 'eureka' | 'etcd';

/**
 * Nacos 服务注册中心选项
 */
export interface NacosServiceRegistryOptions {
  /**
   * Nacos 客户端配置
   */
  client: NacosClientOptions;

  /**
   * 服务实例变更监听轮询间隔（毫秒）
   * @default 5000
   */
  watchInterval?: number;

  /**
   * 心跳间隔（毫秒）
   * @default 5000
   */
  heartbeatInterval?: number;
}

/**
 * 服务注册中心模块选项
 */
export interface ServiceRegistryModuleOptions {
  /**
   * Provider 类型
   */
  provider: ServiceRegistryProvider;

  /**
   * Nacos 配置（当 provider 为 'nacos' 时使用）
   */
  nacos?: NacosServiceRegistryOptions;

  // 未来可以添加其他 provider 的配置
  // consul?: ConsulServiceRegistryOptions;
  // eureka?: EurekaServiceRegistryOptions;
}

/**
 * 服务注册中心模块
 */
@Module({
  providers: [],
})
export class ServiceRegistryModule {
  /**
   * 创建服务注册中心模块
   * @param options - 模块配置
   */
  public static forRoot(options: ServiceRegistryModuleOptions): typeof ServiceRegistryModule {
    const providers: ModuleProvider[] = [];

    let serviceRegistry: ServiceRegistry;

    switch (options.provider) {
      case 'nacos':
        if (!options.nacos) {
          throw new Error('Nacos configuration is required when provider is "nacos"');
        }

        const nacosClient = new NacosClient(options.nacos.client);
        serviceRegistry = new NacosServiceRegistry(nacosClient, {
          watchInterval: options.nacos.watchInterval,
          heartbeatInterval: options.nacos.heartbeatInterval,
        });
        break;

      default:
        throw new Error(`Unsupported service registry provider: ${options.provider}`);
    }

    providers.push({
      provide: SERVICE_REGISTRY_TOKEN,
      useValue: serviceRegistry,
    });

    const existingMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, ServiceRegistryModule) || {};
    const metadata = {
      ...existingMetadata,
      providers: [...(existingMetadata.providers || []), ...providers],
      exports: [
        ...(existingMetadata.exports || []),
        SERVICE_REGISTRY_TOKEN,
      ],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, ServiceRegistryModule);

    return ServiceRegistryModule;
  }
}

