import 'reflect-metadata';
import { ServiceClient as ServiceClientImpl } from './service-client';
import type { ServiceRegistry } from '../service-registry/types';
import { SERVICE_REGISTRY_TOKEN } from '../service-registry/types';
import { ControllerRegistry } from '../../controller/controller';
import type { Constructor } from '../../core/types';

/**
 * ServiceClient 注入装饰器元数据键
 */
const SERVICE_CLIENT_METADATA_KEY = Symbol('service-client:inject');

/**
 * ServiceClient 装饰器
 * 用于在类中注入 ServiceClient 实例
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   public constructor(
 *     @ServiceClient() private readonly serviceClient: ServiceClient,
 *   ) {}
 *
 *   public async callOtherService() {
 *     return await this.serviceClient.call({
 *       serviceName: 'other-service',
 *       path: '/api/data',
 *       method: 'GET',
 *     });
 *   }
 * }
 * ```
 */
export function ServiceClient(): ParameterDecorator {
  return function (
    target: unknown,
    _propertyKey: string | symbol | undefined,
    parameterIndex: number,
  ) {
    const constructor = typeof target === 'function'
      ? (target as Constructor<unknown>)
      : (target as any)?.constructor;

    if (!constructor) {
      return;
    }

    // 保存元数据，标记该参数需要注入 ServiceClient
    const existingMetadata: number[] =
      Reflect.getMetadata(SERVICE_CLIENT_METADATA_KEY, constructor) || [];
    existingMetadata.push(parameterIndex);
    Reflect.defineMetadata(
      SERVICE_CLIENT_METADATA_KEY,
      existingMetadata,
      constructor,
    );
  };
}

/**
 * 创建 ServiceClient 实例
 */
export function createServiceClient(): ServiceClientImpl {
  const container = ControllerRegistry.getInstance().getContainer();
  const serviceRegistry = container.resolve<ServiceRegistry>(
    SERVICE_REGISTRY_TOKEN,
  );

  if (!serviceRegistry) {
    throw new Error(
      'ServiceRegistry not found. Please register ServiceRegistryModule first.',
    );
  }

  return new ServiceClientImpl(serviceRegistry);
}

/**
 * 获取需要注入 ServiceClient 的参数索引列表
 */
export function getServiceClientParameterIndices(
  target: Constructor<unknown>,
): number[] {
  return Reflect.getMetadata(SERVICE_CLIENT_METADATA_KEY, target) || [];
}

