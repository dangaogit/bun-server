import 'reflect-metadata';
import type { RouteHandler } from './types';
import { RouteRegistry } from './registry';
import type { HttpMethod } from './types';
import { CONTROLLER_METADATA_KEY } from '../controller/controller';

/**
 * 路由元数据键
 */
export const ROUTE_METADATA_KEY = Symbol('route');

/**
 * 路由元数据
 */
export interface RouteMetadata {
  method: HttpMethod;
  path: string;
  handler: RouteHandler;
  /**
   * 属性键（用于控制器方法）
   */
  propertyKey?: string;
}

/**
 * 路由装饰器工厂
 * @param method - HTTP 方法
 * @param path - 路由路径
 * @returns 方法装饰器
 */
function createRouteDecorator(method: HttpMethod, path: string) {
  return function (target: any, propertyKey: string | symbol, descriptor: PropertyDescriptor) {
    // 检查是否是控制器方法（有 Controller 装饰器）
    const controllerMetadata = Reflect.getMetadata(CONTROLLER_METADATA_KEY, target.constructor);
    
    if (controllerMetadata) {
      // 控制器方法：只保存元数据，不直接注册路由
      // 路由注册由 ControllerRegistry 处理
      const existingRoutes: RouteMetadata[] = Reflect.getMetadata(ROUTE_METADATA_KEY, target) || [];
      
      // 获取方法名：优先使用 propertyKey，如果不可用则从函数名获取
      let propertyKeyStr: string;
      if (propertyKey && propertyKey !== '') {
        propertyKeyStr = typeof propertyKey === 'string' ? propertyKey : String(propertyKey);
      } else {
        // 从函数名获取（可能不可靠，但作为后备方案）
        propertyKeyStr = descriptor.value.name || '';
      }
      
      // 如果仍然没有方法名，尝试从原型中查找
      if (!propertyKeyStr) {
        const propertyNames = Object.getOwnPropertyNames(target);
        for (const key of propertyNames) {
          const targetDescriptor = Object.getOwnPropertyDescriptor(target, key);
          if (targetDescriptor?.value === descriptor.value) {
            propertyKeyStr = key;
            break;
          }
        }
      }
      
      existingRoutes.push({ 
        method, 
        path, 
        handler: descriptor.value as RouteHandler,
        propertyKey: propertyKeyStr || undefined,
      });
      Reflect.defineMetadata(ROUTE_METADATA_KEY, existingRoutes, target);
    } else {
      // 普通函数：直接注册路由
      const handler = descriptor.value as RouteHandler;
      const registry = RouteRegistry.getInstance();
      registry.register(method, path, handler);

      // 保存元数据（用于兼容性）
      const existingRoutes: RouteMetadata[] = Reflect.getMetadata(ROUTE_METADATA_KEY, target) || [];
      existingRoutes.push({ method, path, handler });
      Reflect.defineMetadata(ROUTE_METADATA_KEY, existingRoutes, target);
    }
  };
}

/**
 * GET 路由装饰器
 * @param path - 路由路径
 */
export function GET(path: string) {
  return createRouteDecorator('GET', path);
}

/**
 * POST 路由装饰器
 * @param path - 路由路径
 */
export function POST(path: string) {
  return createRouteDecorator('POST', path);
}

/**
 * PUT 路由装饰器
 * @param path - 路由路径
 */
export function PUT(path: string) {
  return createRouteDecorator('PUT', path);
}

/**
 * DELETE 路由装饰器
 * @param path - 路由路径
 */
export function DELETE(path: string) {
  return createRouteDecorator('DELETE', path);
}

/**
 * PATCH 路由装饰器
 * @param path - 路由路径
 */
export function PATCH(path: string) {
  return createRouteDecorator('PATCH', path);
}

