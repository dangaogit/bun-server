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
    // 注意：属性 getter 必须是同步的，不能是 async
    // 实际值通过初始化函数在实例化时预加载
    let instances: ServiceInstance[] = [];

    Object.defineProperty(target, propertyKey, {
      get: () => {
        // 同步返回已加载的实例列表（如果还未加载，返回空数组）
        return instances;
      },
      set: (newInstances: ServiceInstance[]) => {
        instances = newInstances;
      },
      enumerable: true,
      configurable: true,
    });
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

/**
 * 初始化类的服务发现属性
 * 在类实例化后调用，自动加载服务实例列表
 */
export async function initializeServiceDiscovery(
  instance: object,
  target: Constructor<unknown>,
): Promise<void> {
  const metadata = getServiceDiscoveryMetadata(target);
  const container = ControllerRegistry.getInstance().getContainer();
  const serviceRegistry = container.resolve<ServiceRegistry>(
    SERVICE_REGISTRY_TOKEN,
  );

  if (!serviceRegistry) {
    return;
  }

  for (const [propertyKey, meta] of metadata.entries()) {
    try {
      const instances = await serviceRegistry.getInstances(meta.serviceName, {
        namespaceId: meta.options?.namespaceId,
        groupName: meta.options?.groupName,
        clusterName: meta.options?.clusterName,
        healthyOnly: meta.options?.healthyOnly ?? true,
      });
      (instance as any)[propertyKey] = instances;

      // 设置监听器以自动更新实例列表
      serviceRegistry.watchInstances(
        meta.serviceName,
        (newInstances) => {
          (instance as any)[propertyKey] = newInstances;
        },
        meta.options,
      );
    } catch (error) {
      console.error(
        `[ServiceDiscovery] Failed to initialize instances for ${meta.serviceName}:`,
        error,
      );
      (instance as any)[propertyKey] = [];
    }
  }
}
