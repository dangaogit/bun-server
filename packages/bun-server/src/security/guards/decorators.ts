import 'reflect-metadata';
import type { GuardType } from './types';
import { GUARDS_METADATA_KEY, ROLES_METADATA_KEY } from './types';

/**
 * 守卫装饰器
 * 可用于控制器或方法级别
 * 
 * @example
 * // 控制器级别
 * @Controller('/api/admin')
 * @UseGuards(AuthGuard, RolesGuard)
 * class AdminController {}
 * 
 * @example
 * // 方法级别
 * @GET('/profile')
 * @UseGuards(AuthGuard)
 * getProfile() {}
 * 
 * @param guards - 守卫类或守卫实例
 * @returns 类或方法装饰器
 */
export function UseGuards(
  ...guards: GuardType[]
): ClassDecorator & MethodDecorator {
  return (
    target: Object | Function,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey !== undefined) {
      // 方法装饰器
      const existingGuards: GuardType[] =
        Reflect.getMetadata(GUARDS_METADATA_KEY, target, propertyKey) || [];
      Reflect.defineMetadata(
        GUARDS_METADATA_KEY,
        [...existingGuards, ...guards],
        target,
        propertyKey,
      );
    } else {
      // 类装饰器
      const existingGuards: GuardType[] =
        Reflect.getMetadata(GUARDS_METADATA_KEY, target) || [];
      Reflect.defineMetadata(
        GUARDS_METADATA_KEY,
        [...existingGuards, ...guards],
        target,
      );
    }
  };
}

/**
 * 角色装饰器
 * 用于标记需要特定角色的方法或控制器
 * 
 * @example
 * @GET('/admin')
 * @Roles('admin', 'superadmin')
 * adminOnly() {}
 * 
 * @param roles - 允许访问的角色列表
 * @returns 类或方法装饰器
 */
export function Roles(
  ...roles: string[]
): ClassDecorator & MethodDecorator {
  return (
    target: Object | Function,
    propertyKey?: string | symbol,
    descriptor?: PropertyDescriptor,
  ) => {
    if (propertyKey !== undefined) {
      // 方法装饰器
      Reflect.defineMetadata(ROLES_METADATA_KEY, roles, target, propertyKey);
    } else {
      // 类装饰器
      Reflect.defineMetadata(ROLES_METADATA_KEY, roles, target);
    }
  };
}

/**
 * 获取守卫元数据
 * @param target - 目标对象（类或原型）
 * @param propertyKey - 方法名（可选）
 * @returns 守卫列表
 */
export function getGuardsMetadata(
  target: Object | Function,
  propertyKey?: string | symbol,
): GuardType[] {
  // 安全检查：确保 target 是有效的对象或函数
  if (target === null || target === undefined) {
    return [];
  }
  if (typeof target !== 'object' && typeof target !== 'function') {
    return [];
  }

  if (propertyKey !== undefined) {
    return Reflect.getMetadata(GUARDS_METADATA_KEY, target, propertyKey) || [];
  }
  return Reflect.getMetadata(GUARDS_METADATA_KEY, target) || [];
}

/**
 * 获取角色元数据
 * @param target - 目标对象（类或原型）
 * @param propertyKey - 方法名（可选）
 * @returns 角色列表
 */
export function getRolesMetadata(
  target: Object | Function,
  propertyKey?: string | symbol,
): string[] {
  if (propertyKey !== undefined) {
    return Reflect.getMetadata(ROLES_METADATA_KEY, target, propertyKey) || [];
  }
  return Reflect.getMetadata(ROLES_METADATA_KEY, target) || [];
}

