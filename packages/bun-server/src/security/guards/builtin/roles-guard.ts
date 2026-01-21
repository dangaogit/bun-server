import { Injectable, Inject } from '../../../di/decorators';
import type { CanActivate, ExecutionContext } from '../types';
import { ROLES_METADATA_KEY } from '../types';
import { SecurityContextHolder } from '../../context';
import { ForbiddenException } from '../../../error/http-exception';
import { ErrorCode } from '../../../error/error-codes';
import { Reflector, REFLECTOR_TOKEN } from '../reflector';

/**
 * 角色守卫
 * 检查用户是否具有所需角色
 * 
 * @example
 * @Controller('/api/admin')
 * @UseGuards(AuthGuard, RolesGuard)
 * class AdminController {
 *   @GET('/dashboard')
 *   @Roles('admin')
 *   dashboard() {
 *     // 只有 admin 角色才能访问
 *   }
 * 
 *   @GET('/super')
 *   @Roles('admin', 'superadmin')
 *   superAdmin() {
 *     // admin 或 superadmin 角色可以访问
 *   }
 * }
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly reflector: Reflector;

  public constructor(
    @Inject(REFLECTOR_TOKEN) reflector?: Reflector,
  ) {
    this.reflector = reflector || new Reflector();
  }

  /**
   * 判断是否允许访问
   * @param context - 执行上下文
   * @returns 如果用户具有所需角色则返回 true
   */
  public canActivate(context: ExecutionContext): boolean {
    // 获取方法和类上定义的角色
    const requiredRoles = this.reflector.getAllAndMerge<string[]>(
      ROLES_METADATA_KEY,
      context.getClass(),
      context.getMethodName(),
    );

    // 如果没有定义角色要求，则允许访问
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 获取当前用户的角色
    const securityContext = SecurityContextHolder.getContext();
    const authentication = securityContext.authentication;

    if (!authentication || !authentication.authenticated) {
      throw new ForbiddenException(
        'Access denied: authentication required for role check',
        { requiredRoles },
        ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
      );
    }

    const userRoles = authentication.authorities || [];

    // 检查用户是否具有任一所需角色
    const hasRole = requiredRoles.some((role) => userRoles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied: required roles [${requiredRoles.join(', ')}], but user has [${userRoles.join(', ')}]`,
        { requiredRoles, userRoles },
        ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
      );
    }

    return true;
  }
}

/**
 * 创建自定义角色守卫
 * 支持自定义角色验证逻辑
 * 
 * @example
 * const CustomRolesGuard = createRolesGuard({
 *   // 所有角色都必须匹配
 *   matchAll: true,
 *   // 自定义角色获取逻辑
 *   getRoles: (context) => {
 *     const user = context.switchToHttp().getRequest().auth?.user;
 *     return user?.roles || [];
 *   },
 * });
 */
export interface RolesGuardOptions {
  /**
   * 是否需要匹配所有角色
   * @default false (只需匹配其中一个)
   */
  matchAll?: boolean;

  /**
   * 自定义获取用户角色的函数
   */
  getRoles?: (context: ExecutionContext) => string[];
}

/**
 * 创建自定义角色守卫工厂
 * @param options - 配置选项
 * @returns 自定义角色守卫类
 */
export function createRolesGuard(options: RolesGuardOptions = {}): new () => CanActivate {
  const { matchAll = false, getRoles } = options;

  @Injectable()
  class CustomRolesGuard implements CanActivate {
    private readonly reflector = new Reflector();

    public canActivate(context: ExecutionContext): boolean {
      const requiredRoles = this.reflector.getAllAndMerge<string[]>(
        ROLES_METADATA_KEY,
        context.getClass(),
        context.getMethodName(),
      );

      if (!requiredRoles || requiredRoles.length === 0) {
        return true;
      }

      let userRoles: string[];

      if (getRoles) {
        userRoles = getRoles(context);
      } else {
        const securityContext = SecurityContextHolder.getContext();
        userRoles = securityContext.authentication?.authorities || [];
      }

      const hasRole = matchAll
        ? requiredRoles.every((role) => userRoles.includes(role))
        : requiredRoles.some((role) => userRoles.includes(role));

      if (!hasRole) {
        throw new ForbiddenException(
          `Access denied: required roles [${requiredRoles.join(', ')}], user has [${userRoles.join(', ')}]`,
          { requiredRoles, userRoles, matchAll },
          ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
        );
      }

      return true;
    }
  }

  return CustomRolesGuard;
}

