import 'reflect-metadata';
import type { InterceptorRegistry } from './interceptor-registry';
import type { Interceptor, InterceptorMetadata } from './types';

/**
 * 扫描方法上的所有拦截器元数据
 * @param target - 目标对象（控制器实例的原型）
 * @param propertyKey - 方法名
 * @param registry - 拦截器注册表
 * @returns 匹配的拦截器列表（按优先级排序）
 */
export function scanInterceptorMetadata(
  target: object,
  propertyKey: string | symbol,
  registry: InterceptorRegistry,
): Interceptor[] {
  const interceptorMetadataList: InterceptorMetadata[] = [];

  // 扫描所有已注册的元数据键
  for (const metadataKey of registry.getAllMetadataKeys()) {
    // 检查方法上是否有该元数据
    const metadata = Reflect.getMetadata(metadataKey, target, propertyKey);
    
    if (metadata !== undefined && metadata !== null) {
      // 找到匹配的元数据，获取对应的拦截器元数据
      // 我们需要获取完整的元数据（包括优先级），而不是只获取拦截器
      const metadataList = (registry as any).interceptors.get(metadataKey);
      if (metadataList) {
        interceptorMetadataList.push(...metadataList);
      }
    }
  }

  // 按优先级排序（数字越小优先级越高）
  interceptorMetadataList.sort((a, b) => a.priority - b.priority);

  // 返回排序后的拦截器列表
  return interceptorMetadataList.map((meta) => meta.interceptor);
}

