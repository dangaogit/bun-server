import 'reflect-metadata';
import type { ControllerMetadata } from './controller';
import { CONTROLLER_METADATA_KEY } from './controller';
import type { RouteMetadata } from '../router/decorators';
import { ROUTE_METADATA_KEY } from '../router/decorators';
import type { Constructor } from '@/core/types'

/**
 * 获取控制器元数据
 * @param target - 控制器类
 * @returns 控制器元数据
 */
export function getControllerMetadata(
  target: Constructor<unknown>,
): ControllerMetadata | undefined {
  return Reflect.getMetadata(CONTROLLER_METADATA_KEY, target);
}

/**
 * 获取路由元数据
 * @param target - 控制器原型
 * @returns 路由元数据列表
 */
export function getRouteMetadata(target: unknown): RouteMetadata[] {
  return Reflect.getMetadata(ROUTE_METADATA_KEY, target as Object) || [];
}

