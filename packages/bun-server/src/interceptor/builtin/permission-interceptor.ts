import 'reflect-metadata';
import { BaseInterceptor } from '../base-interceptor';
import type { Container } from '../../di/container';
import type { Context } from '../../core/context';
import { ForbiddenException } from '../../error';

/**
 * 权限元数据键
 */
export const PERMISSION_METADATA_KEY = Symbol('@dangao/bun-server:interceptor:permission');

/**
 * 权限配置选项
 */
export interface PermissionOptions {
  /**
   * 资源名称
   */
  resource: string;
  /**
   * 操作名称（如：read, write, delete）
   */
  action: string;
  /**
   * 是否允许匿名访问
   * @default false
   */
  allowAnonymous?: boolean;
}

/**
 * 权限服务接口
 * 用户需要实现此接口来提供权限检查逻辑
 */
export interface PermissionService {
  /**
   * 检查权限
   * @param userId - 用户 ID（从请求头或上下文获取）
   * @param resource - 资源名称
   * @param action - 操作名称
   * @returns 是否有权限
   */
  check(userId: string | null, resource: string, action: string): Promise<boolean>;
}

/**
 * 权限装饰器
 * 标记方法需要权限检查
 * @param options - 权限配置选项
 */
export function Permission(options: PermissionOptions): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const metadata = {
      resource: options.resource,
      action: options.action,
      allowAnonymous: options.allowAnonymous ?? false,
    };
    Reflect.defineMetadata(PERMISSION_METADATA_KEY, metadata, target, propertyKey);
  };
}

/**
 * 获取权限元数据
 */
export function getPermissionMetadata(
  target: unknown,
  propertyKey: string | symbol,
): PermissionOptions | undefined {
  if (typeof target === 'object' && target !== null) {
    return Reflect.getMetadata(PERMISSION_METADATA_KEY, target, propertyKey);
  }
  return undefined;
}

/**
 * 权限拦截器
 * 实现权限检查功能
 */
export class PermissionInterceptor extends BaseInterceptor {
  /**
   * 权限服务 Token
   * 用户需要在 DI 容器中注册 PermissionService 实现
   */
  public static readonly PERMISSION_SERVICE_TOKEN = Symbol(
    '@dangao/bun-server:interceptor:permission:service',
  );

  /**
   * 执行拦截器逻辑
   */
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    const metadata = this.getMetadata<PermissionOptions>(
      target,
      propertyKey,
      PERMISSION_METADATA_KEY,
    );

    if (!metadata) {
      // 没有权限元数据，直接执行原方法
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 如果允许匿名访问，直接执行
    if (metadata.allowAnonymous) {
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // 获取用户 ID（从请求头或上下文）
    const userId = this.getUserId(context);

    // 尝试获取权限服务
    let permissionService: PermissionService | undefined;
    try {
      permissionService = this.resolveService<PermissionService>(
        container,
        PermissionInterceptor.PERMISSION_SERVICE_TOKEN,
      );
    } catch (error) {
      // 如果权限服务未注册，抛出错误
      throw new Error(
        'PermissionService not found. Please register PermissionService in DI container.',
      );
    }

    // 检查权限
    const hasPermission = await permissionService.check(
      userId,
      metadata.resource,
      metadata.action,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Permission denied: ${metadata.action} on ${metadata.resource}`,
      );
    }

    // 权限检查通过，执行原方法
    return await Promise.resolve(originalMethod.apply(target, args));
  }

  /**
   * 从上下文获取用户 ID
   */
  private getUserId(context: Context | undefined): string | null {
    if (!context) {
      return null;
    }

    // 优先从 Authorization header 获取（Bearer token）
    const authHeader = this.getHeader(context, 'Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      // 这里可以解析 JWT token 获取用户 ID
      // 简化实现：从 X-User-Id header 获取
    }

    // 从 X-User-Id header 获取
    const userId = this.getHeader(context, 'X-User-Id');
    if (userId) {
      return userId;
    }

    return null;
  }
}

