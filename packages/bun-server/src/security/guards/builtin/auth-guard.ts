import { Injectable } from '../../../di/decorators';
import type { CanActivate, ExecutionContext } from '../types';
import { SecurityContextHolder } from '../../context';
import { UnauthorizedException } from '../../../error/http-exception';
import { ErrorCode } from '../../../error/error-codes';

/**
 * 认证守卫
 * 检查请求是否已认证
 * 
 * @example
 * @Controller('/api/users')
 * @UseGuards(AuthGuard)
 * class UserController {
 *   @GET('/profile')
 *   getProfile() {
 *     // 只有已认证的用户才能访问
 *   }
 * }
 */
@Injectable()
export class AuthGuard implements CanActivate {
  /**
   * 判断是否允许访问
   * @param context - 执行上下文
   * @returns 如果已认证则返回 true，否则抛出 UnauthorizedException
   */
  public canActivate(context: ExecutionContext): boolean {
    const securityContext = SecurityContextHolder.getContext();
    
    if (!securityContext.isAuthenticated()) {
      throw new UnauthorizedException(
        'Authentication required',
        undefined,
        ErrorCode.AUTH_REQUIRED,
      );
    }

    return true;
  }
}

/**
 * 可选认证守卫
 * 如果有 token 则验证，没有 token 也允许访问
 * 
 * @example
 * @GET('/public')
 * @UseGuards(OptionalAuthGuard)
 * publicEndpoint() {
 *   // 未认证也可以访问，但如果有 token 会被验证
 * }
 */
@Injectable()
export class OptionalAuthGuard implements CanActivate {
  /**
   * 判断是否允许访问
   * 总是返回 true，但会检查认证状态
   * @param context - 执行上下文
   * @returns 总是返回 true
   */
  public canActivate(context: ExecutionContext): boolean {
    // 可选认证：不强制要求认证，但如果有认证信息会被使用
    // SecurityFilter 已经处理了 token 解析和认证
    return true;
  }
}

