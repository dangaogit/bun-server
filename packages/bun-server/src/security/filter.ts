import type { Context } from '../core/context';
import type { Middleware } from '../middleware';
import { SecurityContextHolder } from './context';
import { AuthenticationManager } from './authentication-manager';
import { RoleBasedAccessDecisionManager } from './access-decision-manager';
import type { SecurityConfig, AuthenticationRequest } from './types';
import { UnauthorizedException, ForbiddenException } from '../error/http-exception';
import { requiresAuth, getAuthMetadata } from '../auth/decorators';

/**
 * 安全过滤器配置
 */
export interface SecurityFilterConfig extends SecurityConfig {
  /**
   * 认证管理器
   */
  authenticationManager: AuthenticationManager;
  /**
   * 访问决策器
   */
  accessDecisionManager?: RoleBasedAccessDecisionManager;
  /**
   * 令牌提取函数
   */
  extractToken?: (ctx: Context) => string | null;
}

/**
 * 创建安全过滤器
 */
export function createSecurityFilter(config: SecurityFilterConfig): Middleware {
  const {
    authenticationManager,
    accessDecisionManager = new RoleBasedAccessDecisionManager(),
    excludePaths = [],
    defaultAuthRequired = true,
    extractToken,
  } = config;

  return async (ctx: Context, next) => {
    // 检查是否在排除列表中
    const path = ctx.request.url.split('?')[0];
    if (excludePaths.some((exclude) => path.startsWith(exclude))) {
      return await next();
    }

    // 获取安全上下文
    const securityContext = SecurityContextHolder.getContext();

    try {
      // 提取令牌
      const token = extractToken
        ? extractToken(ctx)
        : extractTokenFromHeader(ctx);

      // 如果有令牌，尝试认证
      if (token) {
        const request: AuthenticationRequest = {
          principal: '',
          credentials: token,
          type: 'jwt',
        };

        const authentication = await authenticationManager.authenticate(request);
        if (authentication) {
          securityContext.setAuthentication(authentication);
        }
      }

      // 检查是否需要认证
      const handler = (ctx as any).routeHandler;
      if (handler) {
        const controller = handler.controller;
        const method = handler.method;

        if (requiresAuth(controller, method)) {
          const authentication = securityContext.authentication;
          if (!authentication || !authentication.authenticated) {
            throw new UnauthorizedException('Authentication required');
          }

          // 检查角色权限
          const requiredRoles = getRequiredRoles(controller, method);
          if (requiredRoles.length > 0) {
            const hasAccess = accessDecisionManager.decide(
              authentication,
              requiredRoles,
            );
            if (!hasAccess) {
              throw new ForbiddenException('Insufficient permissions');
            }
          }
        }
      } else if (defaultAuthRequired && !securityContext.isAuthenticated()) {
        throw new UnauthorizedException('Authentication required');
      }

      // 将安全上下文附加到 Context
      (ctx as any).security = securityContext;
      (ctx as any).auth = {
        isAuthenticated: securityContext.isAuthenticated(),
        user: securityContext.getPrincipal(),
        payload: (securityContext.authentication?.details as any),
      };

      return await next();
    } finally {
      // 清理上下文（可选，取决于是否需要保持上下文）
      // SecurityContextHolder.clearContext();
    }
  };
}

/**
 * 从请求头提取令牌
 */
function extractTokenFromHeader(ctx: Context): string | null {
  const authHeader = ctx.getHeader('authorization');
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

/**
 * 获取需要的角色
 */
function getRequiredRoles(target: any, propertyKey: string | symbol): string[] {
  const metadata = getAuthMetadata(target, propertyKey);
  return metadata?.roles || [];
}

