import 'reflect-metadata';
import type { ServiceCallOptions, ServiceCallResponse } from './types';
import type { Constructor } from '../../core/types';

/**
 * 服务调用装饰器元数据键
 */
const SERVICE_CALL_METADATA_KEY = Symbol('service-call:metadata');

/**
 * 服务调用元数据
 */
export interface ServiceCallMetadata {
  /**
   * 服务名
   */
  serviceName: string;

  /**
   * HTTP 方法
   */
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

  /**
   * 请求路径
   */
  path: string;

  /**
   * 服务调用选项
   */
  options?: Partial<ServiceCallOptions>;
}

/**
 * ServiceCall 装饰器
 * 用于标记服务调用方法，自动注入 ServiceClient 调用逻辑
 *
 * @example
 * ```typescript
 * @Injectable()
 * class MyService {
 *   public constructor(
 *     @ServiceClient() private readonly serviceClient: ServiceClient,
 *   ) {}
 *
 *   @ServiceCall('user-service', 'GET', '/api/users/:id')
 *   public async getUser(id: string): Promise<User> {
 *     // 自动调用 user-service 的 /api/users/:id 接口
 *     // 需要手动调用 serviceClient.call()，装饰器只提供元数据
 *   }
 * }
 * ```
 *
 * 注意：此装饰器主要用于标记和提供元数据，实际调用仍需要通过 ServiceClient
 */
export function ServiceCall(
  serviceName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  path: string,
  options?: Partial<ServiceCallOptions>,
): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const metadata: ServiceCallMetadata = {
      serviceName,
      method,
      path,
      options,
    };

    // 保存元数据
    const existingMetadata: Map<string | symbol, ServiceCallMetadata> =
      Reflect.getMetadata(SERVICE_CALL_METADATA_KEY, target.constructor) ||
      new Map();
    existingMetadata.set(propertyKey, metadata);
    Reflect.defineMetadata(
      SERVICE_CALL_METADATA_KEY,
      existingMetadata,
      target.constructor,
    );

    // 保存原始方法
    const originalMethod = descriptor.value;

    // 包装方法，添加服务调用元数据
    descriptor.value = async function (...args: any[]) {
      // 元数据可以通过 Reflect.getMetadata 获取
      // 实际调用逻辑需要结合 ServiceClient 实现
      // 这里只提供元数据标记，不自动执行调用
      return originalMethod.apply(this, args);
    };
  };
}

/**
 * 获取方法的服务调用元数据
 */
export function getServiceCallMetadata(
  target: Constructor<unknown>,
): Map<string | symbol, ServiceCallMetadata> {
  return Reflect.getMetadata(SERVICE_CALL_METADATA_KEY, target) || new Map();
}

