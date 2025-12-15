import 'reflect-metadata';
import type { ServiceRegistry, ServiceInstance } from './types';
import { SERVICE_REGISTRY_TOKEN } from './types';
import { ControllerRegistry } from '../../controller/controller';
import type { Constructor } from '../../core/types';

/**
 * 服务发现装饰器元数据键
 */
const SERVICE_DISCOVERY_METADATA_KEY = Symbol('service-discovery:metadata');

/**
 * 服务发现元数据
 */
export interface ServiceDiscoveryMetadata {
  /**
   * 服务名
   */
  serviceName: string;

  /**
   * 服务实例查询选项
   */
  options?: {
    namespaceId?: string;
    groupName?: string;
    clusterName?: string;
    healthyOnly?: boolean;
  };

  /**
   * 属性名（用于注入服务实例列表）
   */
  propertyKey?: string | symbol;
}

/**
 * ServiceDiscovery 装饰器
 * 用于自动注入服务实例列表
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   @ServiceDiscovery('my-service')
 *   public instances: ServiceInstance[] = [];
 *
 *   public async getServiceInstances() {
 *     // instances 会自动更新
 *     return this.instances;
 *   }
 * }
 * ```
 */
export function ServiceDiscovery(
  serviceName: string,
  options?: {
    namespaceId?: string;
    groupName?: string;
    clusterName?: string;
    healthyOnly?: boolean;
  },
): PropertyDecorator {
  return function (target: object, propertyKey: string | symbol) {
    const metadata: ServiceDiscoveryMetadata = {
      serviceName,
      options,
      propertyKey,
    };

    // 保存元数据
    const existingMetadata: Map<string | symbol, ServiceDiscoveryMetadata> =
      Reflect.getMetadata(SERVICE_DISCOVERY_METADATA_KEY, target.constructor) ||
      new Map();
    existingMetadata.set(propertyKey, metadata);
    Reflect.defineMetadata(
      SERVICE_DISCOVERY_METADATA_KEY,
      existingMetadata,
      target.constructor,
    );

    // 定义属性描述符，实现自动注入
    let instances: ServiceInstance[] = [];

    Object.defineProperty(target, propertyKey, {
      get: async () => {
        // 如果已经有实例且不监听变更，直接返回
        if (instances.length > 0 && !options?.healthyOnly) {
          return instances;
        }

        // 从容器获取 ServiceRegistry
        const container = ControllerRegistry.getInstance().getContainer();
        const serviceRegistry = container.resolve<ServiceRegistry>(
          SERVICE_REGISTRY_TOKEN,
        );

        if (!serviceRegistry) {
          return [];
        }

        try {
          instances = await serviceRegistry.getInstances(serviceName, {
            namespaceId: options?.namespaceId,
            groupName: options?.groupName,
            clusterName: options?.clusterName,
            healthyOnly: options?.healthyOnly ?? true,
          });
          return instances;
        } catch (error) {
          console.error(
            `[ServiceDiscovery] Failed to get instances for ${serviceName}:`,
            error,
          );
          return [];
        }
      },
      set: (newInstances: ServiceInstance[]) => {
        instances = newInstances;
      },
      enumerable: true,
      configurable: true,
    });

    // 如果启用监听，设置监听器
    if (options?.healthyOnly !== false) {
      const container = ControllerRegistry.getInstance().getContainer();
      const serviceRegistry = container.resolve<ServiceRegistry>(
        SERVICE_REGISTRY_TOKEN,
      );

      if (serviceRegistry) {
        serviceRegistry.watchInstances(serviceName, (newInstances) => {
          instances = newInstances;
        }, options);
      }
    }
  };
}

/**
 * 获取类的所有服务发现元数据
 */
export function getServiceDiscoveryMetadata(
  target: Constructor<unknown>,
): Map<string | symbol, ServiceDiscoveryMetadata> {
  return (
    Reflect.getMetadata(SERVICE_DISCOVERY_METADATA_KEY, target) || new Map()
  );
}

