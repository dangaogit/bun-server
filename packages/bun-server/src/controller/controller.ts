import 'reflect-metadata';
import { Container } from '../di/container';
import { RouteRegistry } from '../router/registry';
import type { Context } from '../core/context';
import { ParamBinder } from './param-binder';
import { getControllerMetadata, getRouteMetadata } from './metadata';
import { getClassMiddlewares, getMethodMiddlewares } from '../middleware';
import type { Middleware } from '../middleware';
import { getValidationMetadata, validateParameters, ValidationError } from '../validation';
import { HttpException } from '../error';
import type { Constructor } from '@/core/types';
import {
  type InterceptorRegistry,
  INTERCEPTOR_REGISTRY_TOKEN,
  InterceptorChain,
  scanInterceptorMetadata,
} from '../interceptor';

/**
 * 控制器元数据键
 */
export const CONTROLLER_METADATA_KEY = Symbol('controller');

/**
 * 控制器元数据
 */
export interface ControllerMetadata {
  /**
   * 基础路径
   */
  path: string;

  /**
   * 控制器类
   */
  target: Constructor<unknown>;
}

/**
 * Controller 装饰器
 * 标记类为控制器，并指定基础路径
 * @param path - 控制器基础路径
 */
export function Controller(path: string = '') {
  return function (target: Constructor<unknown>) {
    // 保存控制器元数据
    Reflect.defineMetadata(CONTROLLER_METADATA_KEY, { path, target }, target);
  };
}

/**
 * 控制器注册表
 * 管理所有控制器及其路由
 */
export class ControllerRegistry {
  private static instance: ControllerRegistry;
  private readonly container: Container;
  private readonly controllers = new Map<Constructor<unknown>, unknown>();
  private readonly controllerContainers = new Map<Constructor<unknown>, Container>();

  private constructor() {
    this.container = new Container();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): ControllerRegistry {
    if (!ControllerRegistry.instance) {
      ControllerRegistry.instance = new ControllerRegistry();
    }
    return ControllerRegistry.instance;
  }

  /**
   * 注册控制器
   * @param controllerClass - 控制器类
   */
  public register(controllerClass: Constructor<unknown>, container?: Container): void {
    const targetContainer = container ?? this.container;
    this.controllerContainers.set(controllerClass, targetContainer);
    if (!targetContainer.isRegistered(controllerClass)) {
      targetContainer.register(controllerClass);
    }

    // 获取控制器元数据
    const metadata = getControllerMetadata(controllerClass);
    if (!metadata) {
      throw new Error(`Controller ${controllerClass.name} must be decorated with @Controller()`);
    }

    // 获取路由元数据（从原型获取）
    const prototype = controllerClass.prototype;
    const routes = getRouteMetadata(prototype);
    
    if (!routes || routes.length === 0) {
      // 没有路由，跳过（可能是装饰器还没有执行）
      return;
    }

    const classMiddlewares = getClassMiddlewares(controllerClass);

    // 注册所有路由
    const basePath = metadata.path;
    const registry = RouteRegistry.getInstance();

    for (const route of routes) {
      // 组合基础路径和方法路径
      const fullPath = this.combinePaths(basePath, route.path);

      // 获取方法名：优先使用 propertyKey，否则通过函数引用查找
      let propertyKey = route.propertyKey;
      if (!propertyKey) {
        // 通过函数引用查找方法名
        const prototype = controllerClass.prototype;
        const propertyNames = Object.getOwnPropertyNames(prototype);
        for (const key of propertyNames) {
          if (key === 'constructor') continue;
          const descriptor = Object.getOwnPropertyDescriptor(prototype, key);
          if (descriptor && descriptor.value === route.handler) {
            propertyKey = key;
            break;
          }
        }
      }

      if (!propertyKey) {
        // 如果仍然找不到方法名，跳过这个路由
        continue;
      }

      // 创建路由处理器，支持控制器方法调用
      const handler = async (context: Context): Promise<Response> => {
        try {
          // 从容器解析控制器实例
          const controllerContainer = this.controllerContainers.get(controllerClass) ?? this.container;
          const controllerInstance = controllerContainer.resolve(controllerClass);

          // 绑定参数（从原型获取元数据，因为装饰器元数据保存在原型上）
          const prototype = controllerClass.prototype;
          const params = await ParamBinder.bind(prototype, propertyKey!, context, controllerContainer);

          // 执行参数验证
          const validationMetadata = getValidationMetadata(prototype, propertyKey!);
          if (validationMetadata.length > 0) {
            validateParameters(params, validationMetadata);
          }

          // 调用控制器方法
          // 优先从实例获取，如果不存在则从原型获取
          // 注意：prototype 已在上面声明（第 140 行），因为后续扫描拦截器元数据时需要用到
          let method = (controllerInstance as Record<string, (...args: unknown[]) => unknown>)[propertyKey!];
          if (!method || typeof method !== 'function') {
            // 从构造函数原型获取方法
            method = prototype[propertyKey!];
          }
          if (!method || typeof method !== 'function') {
            throw new Error(`Method ${propertyKey} not found on controller ${controllerClass.name}`);
          }

          // 获取拦截器注册表
          let interceptorRegistry: InterceptorRegistry | undefined;
          try {
            interceptorRegistry = controllerContainer.resolve<InterceptorRegistry>(
              INTERCEPTOR_REGISTRY_TOKEN,
            );
          } catch (error) {
            // 如果拦截器注册表未注册，继续执行（向后兼容）
            interceptorRegistry = undefined;
          }

          // 执行拦截器链或直接调用方法
          let result: unknown;
          if (interceptorRegistry) {
            // 扫描方法上的所有拦截器元数据
            const interceptors = scanInterceptorMetadata(
              prototype,
              propertyKey!,
              interceptorRegistry,
            );

            if (interceptors.length > 0) {
              // 执行拦截器链
              // 注意：传递 controllerInstance 以确保 originalMethod.apply 的 this 绑定正确
              // getMetadata 方法已经修复以支持从原型链查找元数据
              result = await InterceptorChain.execute(
                interceptors,
                controllerInstance,
                propertyKey!,
                method,
                params,
                controllerContainer,
                context,
              );
            } else {
              // 没有拦截器，直接执行方法
              result = method.apply(controllerInstance, params);
            }
          } else {
            // 拦截器注册表未注册，直接执行方法（向后兼容）
            result = method.apply(controllerInstance, params);
          }

          // 处理异步结果
          const responseData = await Promise.resolve(result);

          // 如果已经是 Response 对象，直接返回
          if (responseData instanceof Response) {
            return responseData;
          }

          // 创建响应
          return context.createResponse(responseData);
        } catch (error) {
          // 使用全局错误处理器，确保错误码和国际化正确应用
          const { handleError } = await import('../error/handler');
          return await handleError(error, context);
        }
      };

      // 组合中间件：类级 + 方法级
      const middlewares: Middleware[] = [...classMiddlewares];
      if (propertyKey) {
        middlewares.push(...getMethodMiddlewares(prototype, propertyKey));
      }

      // 注册路由，传递控制器和方法信息
      registry.register(route.method, fullPath, handler, middlewares, controllerClass, propertyKey);
    }
  }

  /**
   * 组合路径
   * @param basePath - 基础路径
   * @param methodPath - 方法路径
   * @returns 组合后的路径
   *
   * 路径规范化规则：
   * - [/ + /api/base] -> /api/base
   * - [// + /api/base] -> /api/base
   * - [/api + /base] -> /api/base
   * - [/api/ + base] -> /api/base
   * - [/api/base + ""] -> /api/base
   * - [/api/base + /] -> /api/base
   */
  private combinePaths(basePath: string, methodPath: string): string {
    // 规范化 basePath：
    // 1. 移除所有末尾斜杠
    // 2. 确保以单个 / 开头
    // 3. 合并多个连续斜杠为单个斜杠
    let base = basePath
      .replace(/\/+$/, '')    // 移除末尾所有斜杠
      .replace(/^\/+/, '/')   // 确保开头只有一个斜杠
      .replace(/\/+/g, '/');  // 合并多个连续斜杠

    // 如果 base 为空，设为 /
    if (!base) {
      base = '/';
    }

    // 规范化 methodPath：移除前导斜杠
    const method = methodPath.replace(/^\/+/, '');

    if (!method) {
      // 如果方法路径为空，返回基础路径
      return base === '/' ? '/' : base;
    }

    // 组合路径：如果 base 是 '/'，直接返回 '/' + method，避免 '//method'
    if (base === '/') {
      return '/' + method;
    }

    return base + '/' + method;
  }

  /**
   * 获取 DI 容器
   * @returns DI 容器
   */
  public getContainer(): Container {
    return this.container;
  }

  /**
   * 获取所有已注册的控制器类
   * @returns 控制器类数组
   */
  public getAllControllers(): Constructor<unknown>[] {
    return Array.from(this.controllerContainers.keys());
  }

  /**
   * 获取所有已注册的控制器类
   * @returns 控制器类数组
   */
  public getRegisteredControllers(): Constructor<unknown>[] {
    return Array.from(this.controllerContainers.keys());
  }

  /**
   * 清除所有控制器注册和容器状态（主要用于测试）
   */
  public clear(): void {
    this.controllers.clear();
    this.container.clear();
    this.controllerContainers.clear();
  }
}

