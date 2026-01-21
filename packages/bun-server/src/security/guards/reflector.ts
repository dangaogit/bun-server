import 'reflect-metadata';
import type { Constructor } from '../../core/types';

/**
 * Reflector 工具类
 * 用于获取类和方法的元数据
 */
export class Reflector {
  /**
   * 获取元数据
   * 优先从方法获取，如果方法没有则从类获取
   * 
   * @param metadataKey - 元数据键
   * @param target - 目标类或方法
   * @returns 元数据值
   */
  public get<T>(
    metadataKey: string | symbol,
    target: Function | Object,
  ): T | undefined {
    return Reflect.getMetadata(metadataKey, target) as T | undefined;
  }

  /**
   * 从类获取元数据
   * @param metadataKey - 元数据键
   * @param target - 目标类
   * @returns 元数据值
   */
  public getFromClass<T>(
    metadataKey: string | symbol,
    target: Constructor<unknown>,
  ): T | undefined {
    return Reflect.getMetadata(metadataKey, target) as T | undefined;
  }

  /**
   * 从方法获取元数据
   * @param metadataKey - 元数据键
   * @param target - 目标类原型
   * @param propertyKey - 方法名
   * @returns 元数据值
   */
  public getFromMethod<T>(
    metadataKey: string | symbol,
    target: Object,
    propertyKey: string | symbol,
  ): T | undefined {
    return Reflect.getMetadata(metadataKey, target, propertyKey) as T | undefined;
  }

  /**
   * 获取元数据（支持合并类和方法的元数据）
   * 对于数组类型，将类和方法的元数据合并
   * 
   * @param metadataKey - 元数据键
   * @param target - 目标类
   * @param propertyKey - 方法名
   * @returns 合并后的元数据值
   */
  public getAllAndMerge<T extends unknown[]>(
    metadataKey: string | symbol,
    target: Constructor<unknown>,
    propertyKey: string | symbol,
  ): T {
    const classMetadata = this.getFromClass<T>(metadataKey, target) || ([] as unknown as T);
    const methodMetadata = this.getFromMethod<T>(metadataKey, target.prototype, propertyKey) || ([] as unknown as T);

    // 合并数组
    return [...classMetadata, ...methodMetadata] as T;
  }

  /**
   * 获取元数据（方法优先）
   * 如果方法有元数据则返回方法的，否则返回类的
   * 
   * @param metadataKey - 元数据键
   * @param target - 目标类
   * @param propertyKey - 方法名
   * @returns 元数据值
   */
  public getAllAndOverride<T>(
    metadataKey: string | symbol,
    target: Constructor<unknown>,
    propertyKey: string | symbol,
  ): T | undefined {
    const methodMetadata = this.getFromMethod<T>(metadataKey, target.prototype, propertyKey);
    if (methodMetadata !== undefined) {
      return methodMetadata;
    }
    return this.getFromClass<T>(metadataKey, target);
  }
}

/**
 * Reflector Token
 */
export const REFLECTOR_TOKEN = Symbol('@dangao/bun-server:reflector');

