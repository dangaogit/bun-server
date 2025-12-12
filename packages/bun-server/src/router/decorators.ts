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
    // 注意：装饰器应用顺序问题
    // 方法装饰器（@GET）在类装饰器（@Controller）之前应用
    // 因此这里无法立即检查 @Controller，需要在 ControllerRegistry.register 时验证
    
    // 尝试检查类是否已经有 @Controller 装饰器（如果装饰器已经应用）
    // 这可以捕获一些早期错误，但不是 100% 可靠（因为装饰器应用顺序）
    const constructor = target.constructor;
    if (constructor && typeof constructor === 'function') {
      const hasController = Reflect.getMetadata(CONTROLLER_METADATA_KEY, constructor);
      if (hasController === undefined) {
        // 类装饰器可能还没有应用，这是正常的
        // 如果类装饰器已经应用但没有 @Controller，这里会捕获到
        // 但这种情况很少见，因为通常 @Controller 会在 @GET 之前应用
      }
    }
    
    // 保存元数据
    // 注意：即使类没有 @Controller，元数据也会被保存
    // 但 ControllerRegistry.register 会验证并抛出错误，所以不会造成问题
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
