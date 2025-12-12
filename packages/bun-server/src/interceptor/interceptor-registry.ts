import type { Interceptor, InterceptorMetadata } from './types';
import { INTERCEPTOR_REGISTRY_TOKEN } from './types';

/**
 * 拦截器注册表
 * 管理所有注册的拦截器，支持按优先级排序
 */
export class InterceptorRegistry {
  /**
   * 拦截器存储
   * key: 元数据键（Symbol）
   * value: 拦截器元数据列表
   */
  private readonly interceptors = new Map<symbol, InterceptorMetadata[]>();

  /**
   * 注册拦截器
   * @param metadataKey - 元数据键（用于匹配装饰器）
   * @param interceptor - 拦截器实例
   * @param priority - 优先级（数字越小优先级越高，默认 100）
   */
  public register(
    metadataKey: symbol,
    interceptor: Interceptor,
    priority: number = 100,
  ): void {
    if (!this.interceptors.has(metadataKey)) {
      this.interceptors.set(metadataKey, []);
    }

    const metadataList = this.interceptors.get(metadataKey)!;
    
    // 检查是否已注册相同的拦截器
    const exists = metadataList.some(
      (meta) => meta.interceptor === interceptor,
    );
    
    if (!exists) {
      metadataList.push({
        metadataKey,
        interceptor,
        priority,
      });
      
      // 按优先级排序（数字越小优先级越高）
      metadataList.sort((a, b) => a.priority - b.priority);
    }
  }

  /**
   * 获取拦截器元数据列表（按优先级排序）
   * @param metadataKey - 元数据键
   * @returns 拦截器元数据列表
   */
  public getInterceptorMetadata(metadataKey: symbol): InterceptorMetadata[] {
    const metadataList = this.interceptors.get(metadataKey);
    if (!metadataList || metadataList.length === 0) {
      return [];
    }
    
    // 返回已排序的拦截器元数据列表（包括优先级信息）
    return [...metadataList];
  }

  /**
   * 获取拦截器列表（按优先级排序）
   * @param metadataKey - 元数据键
   * @returns 拦截器列表
   */
  public getInterceptors(metadataKey: symbol): Interceptor[] {
    const metadataList = this.interceptors.get(metadataKey);
    if (!metadataList || metadataList.length === 0) {
      return [];
    }
    
    // 返回已排序的拦截器列表
    return metadataList.map((meta) => meta.interceptor);
  }

  /**
   * 检查是否有拦截器
   * @param metadataKey - 元数据键
   * @returns 是否有拦截器
   */
  public hasInterceptor(metadataKey: symbol): boolean {
    const metadataList = this.interceptors.get(metadataKey);
    return metadataList !== undefined && metadataList.length > 0;
  }

  /**
   * 获取所有已注册的元数据键
   * @returns 元数据键迭代器
   */
  public getAllMetadataKeys(): IterableIterator<symbol> {
    return this.interceptors.keys();
  }

  /**
   * 清除所有拦截器
   */
  public clear(): void {
    this.interceptors.clear();
  }

  /**
   * 移除指定元数据键的所有拦截器
   * @param metadataKey - 元数据键
   */
  public remove(metadataKey: symbol): void {
    this.interceptors.delete(metadataKey);
  }

  /**
   * 获取拦截器数量
   * @param metadataKey - 元数据键（可选）
   * @returns 拦截器数量
   */
  public count(metadataKey?: symbol): number {
    if (metadataKey) {
      const metadataList = this.interceptors.get(metadataKey);
      return metadataList ? metadataList.length : 0;
    }
    
    // 返回所有拦截器的总数
    let total = 0;
    for (const metadataList of this.interceptors.values()) {
      total += metadataList.length;
    }
    return total;
  }
}

