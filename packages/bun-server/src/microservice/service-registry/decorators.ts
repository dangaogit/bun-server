import 'reflect-metadata';
import type { ServiceRegistry, ServiceInstance } from './types';
import { SERVICE_REGISTRY_TOKEN } from './types';
import { ControllerRegistry } from '../../controller/controller';
import { ServiceRegistryHealthIntegration } from './health-integration';
import type { Constructor } from '../../core/types';

/**
 * 服务注册装饰器元数据键
 */
const SERVICE_REGISTRY_METADATA_KEY = Symbol('service-registry:metadata');

/**
 * 服务注册元数据
 */
export interface ServiceRegistryMetadata {
  /**
   * 服务名
   */
  serviceName: string;

  /**
   * 服务 IP（可选，默认从 Application 获取）
   */
  ip?: string;

  /**
   * 服务端口（可选，默认从 Application 获取）
   */
  port?: number;

  /**
   * 服务权重（可选）
   */
  weight?: number;

  /**
   * 是否启用（可选）
   */
  enabled?: boolean;

  /**
   * 元数据（可选）
   */
  metadata?: Record<string, string>;

  /**
   * 集群名（可选）
   */
  clusterName?: string;

  /**
   * 命名空间（可选）
   */
  namespaceId?: string;

  /**
   * 分组名（可选）
   */
  groupName?: string;

  /**
   * 是否健康（可选）
   */
  healthy?: boolean;
}

/**
 * ServiceRegistry 装饰器
 * 用于自动注册服务到注册中心
 *
 * @example
 * ```typescript
 * @ServiceRegistry('my-service', { port: 3000 })
 * @Controller('/api')
 * class MyController {
 *   // 服务会在应用启动时自动注册
 * }
 * ```
 */
export function ServiceRegistry(
  serviceName: string,
  options?: {
    ip?: string;
    port?: number;
    weight?: number;
    enabled?: boolean;
    metadata?: Record<string, string>;
    clusterName?: string;
    namespaceId?: string;
    groupName?: string;
    healthy?: boolean;
  },
): ClassDecorator {
  return function (target: Constructor<unknown> | Function) {
    const targetClass = target as Constructor<unknown>;
    const metadata: ServiceRegistryMetadata = {
      serviceName,
      ip: options?.ip,
      port: options?.port,
      weight: options?.weight,
      enabled: options?.enabled,
      metadata: options?.metadata,
      clusterName: options?.clusterName,
      namespaceId: options?.namespaceId,
      groupName: options?.groupName,
      healthy: options?.healthy ?? true,
    };

    Reflect.defineMetadata(SERVICE_REGISTRY_METADATA_KEY, metadata, targetClass);
  };
}

/**
 * 获取服务注册元数据
 */
export function getServiceRegistryMetadata(
  target: Constructor<unknown>,
): ServiceRegistryMetadata | undefined {
  return Reflect.getMetadata(SERVICE_REGISTRY_METADATA_KEY, target);
}

// 全局健康检查集成器实例（每个应用一个）
let healthIntegration: ServiceRegistryHealthIntegration | undefined;

/**
 * 注册服务实例
 */
export async function registerServiceInstance(
  target: Constructor<unknown>,
  appPort?: number,
  appHost?: string,
): Promise<void> {
  const metadata = getServiceRegistryMetadata(target);
  if (!metadata) {
    return;
  }

  const container = ControllerRegistry.getInstance().getContainer();
  const serviceRegistry = container.resolve<ServiceRegistry>(
    SERVICE_REGISTRY_TOKEN,
  );

  if (!serviceRegistry) {
    console.warn(
      `[ServiceRegistry] ServiceRegistry not found, skipping registration for ${metadata.serviceName}`,
    );
    return;
  }

  const instance: ServiceInstance = {
    serviceName: metadata.serviceName,
    ip: metadata.ip ?? appHost ?? '127.0.0.1',
    port: metadata.port ?? appPort ?? 3000,
    weight: metadata.weight,
    enabled: metadata.enabled ?? true,
    metadata: metadata.metadata,
    clusterName: metadata.clusterName,
    namespaceId: metadata.namespaceId,
    groupName: metadata.groupName,
    healthy: metadata.healthy ?? true,
  };

  try {
    // 如果启用了健康检查集成，使用集成器注册
    const hasHealthModule = container.isRegistered(
      Symbol('@dangao/bun-server:health:indicators'),
    );

    if (hasHealthModule) {
      if (!healthIntegration) {
        healthIntegration = new ServiceRegistryHealthIntegration();
      }
      await healthIntegration.registerWithHealthCheck(instance);
    } else {
      // 普通注册
      await serviceRegistry.register(instance);
    }

    console.log(
      `[ServiceRegistry] Service ${metadata.serviceName} registered successfully at ${instance.ip}:${instance.port}`,
    );
  } catch (error) {
    console.error(
      `[ServiceRegistry] Failed to register service ${metadata.serviceName}:`,
      error,
    );
  }
}

/**
 * 注销服务实例
 */
export async function deregisterServiceInstance(
  target: Constructor<unknown>,
  appPort?: number,
  appHost?: string,
): Promise<void> {
  const metadata = getServiceRegistryMetadata(target);
  if (!metadata) {
    return;
  }

  const container = ControllerRegistry.getInstance().getContainer();
  const serviceRegistry = container.resolve<ServiceRegistry>(
    SERVICE_REGISTRY_TOKEN,
  );

  if (!serviceRegistry) {
    return;
  }

  const instance: ServiceInstance = {
    serviceName: metadata.serviceName,
    ip: metadata.ip ?? appHost ?? '127.0.0.1',
    port: metadata.port ?? appPort ?? 3000,
  };

  try {
    await serviceRegistry.deregister(instance);

    // 停止健康检查更新（如果是最后一个实例）
    if (healthIntegration) {
      healthIntegration.stop();
      healthIntegration = undefined;
    }

    console.log(
      `[ServiceRegistry] Service ${metadata.serviceName} deregistered successfully`,
    );
  } catch (error) {
    console.error(
      `[ServiceRegistry] Failed to deregister service ${metadata.serviceName}:`,
      error,
    );
  }
}

