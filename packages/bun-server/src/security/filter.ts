import type { Context } from '../core/context';
import type { Middleware } from '../middleware';
import type { Container } from '../di/container';
import { SecurityContextHolder } from './context';
import { AuthenticationManager } from './authentication-manager';
import { RoleBasedAccessDecisionManager } from './access-decision-manager';
import type { SecurityConfig, AuthenticationRequest } from './types';
import {
  UnauthorizedException,
  ForbiddenException,
} from '../error/http-exception';
import { ErrorCode } from '../error/error-codes';
import { requiresAuth, getAuthMetadata } from '../auth/decorators';
import { GuardRegistry } from './guards/guard-registry';
import { ExecutionContextImpl } from './guards/execution-context';
import { Reflector, REFLECTOR_TOKEN } from './guards/reflector';
import { GUARD_REGISTRY_TOKEN } from './guards/types';

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
  /**
   * DI 容器（用于解析守卫）
   */
  container?: Container;
  /**
   * 守卫注册表
   */
  guardRegistry?: GuardRegistry;
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
    container: initialContainer,
    guardRegistry,
  } = config;

  // 创建或使用传入的守卫注册表
  const registry = guardRegistry || new GuardRegistry();

  // 延迟获取容器的函数
  let cachedContainer: Container | null = initialContainer || null;
  const getContainer = (): Container | null => {
    if (cachedContainer) {
      return cachedContainer;
    }
    // 尝试从 ControllerRegistry 获取容器
    try {
      // 动态导入避免循环依赖
      const { ControllerRegistry } = require('../controller/controller');
      cachedContainer = ControllerRegistry.getInstance().getContainer();
      return cachedContainer;
    } catch {
      return null;
    }
  };

  return async (ctx: Context, next) => {
    return SecurityContextHolder.runWithContext(async () => {
      // 检查是否在排除列表中
      // 使用 ctx.path 而不是 ctx.request.url，因为 Context 已经解析了路径
      const path =
        ctx.path || ctx.request.url.split('?')[0].replace(/^https?:\/\/[^/]+/, '');
      if (excludePaths.some((exclude) => path.startsWith(exclude))) {
        return await next();
      }

      // 获取安全上下文（绑定到当前 AsyncLocalStorage 上下文）
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

        // 将安全上下文附加到 Context（在守卫执行前）
        (ctx as any).security = securityContext;
        (ctx as any).auth = {
          isAuthenticated: securityContext.isAuthenticated(),
          user: securityContext.getPrincipal(),
          payload: (securityContext.authentication?.details as any),
        };

        // 检查是否需要认证
        const handler = (ctx as any).routeHandler;
        if (handler) {
          const controllerClass = handler.controller;
          const controllerTarget =
            (controllerClass && controllerClass.prototype) || controllerClass;
          const method = handler.method;

          // 执行守卫链（在 @Auth 检查之前）
          // Guards 在中间件之后、拦截器之前执行
          const container = getContainer();
          // 只有当 controllerClass 是一个有效的类（构造函数）时才执行守卫
          // 测试中可能传入原型而不是类，这种情况跳过守卫执行
          if (container && typeof controllerClass === 'function') {
            const methodHandler = controllerTarget[method];
            const executionContext = new ExecutionContextImpl(
              ctx,
              controllerClass,
              method,
              methodHandler || (() => {}),
            );
            await registry.executeGuards(executionContext, container);
          }

          // 传统的 @Auth 装饰器检查（向后兼容）
          if (requiresAuth(controllerTarget, method)) {
            const authentication = securityContext.authentication;
            if (!authentication || !authentication.authenticated) {
              throw new UnauthorizedException(
                'Authentication required',
                undefined,
                ErrorCode.AUTH_REQUIRED,
              );
            }

            // 检查角色权限
            const requiredRoles = getRequiredRoles(controllerTarget, method);
            if (requiredRoles.length > 0) {
              const hasAccess = accessDecisionManager.decide(
                authentication,
                requiredRoles,
              );
              if (!hasAccess) {
                // 调试信息：输出权限检查详情
                const userRoles = authentication.authorities || [];
                throw new ForbiddenException(
                  `Insufficient permissions. Required roles: ${requiredRoles.join(', ')}, User roles: ${userRoles.join(', ')}`,
                  { requiredRoles, userRoles },
                  ErrorCode.AUTH_INSUFFICIENT_PERMISSIONS,
                );
              }
            }
          }
        } else if (defaultAuthRequired && !securityContext.isAuthenticated()) {
          throw new UnauthorizedException(
            'Authentication required',
            undefined,
            ErrorCode.AUTH_REQUIRED,
          );
        }

        return await next();
      } finally {
        // 清理当前请求内的认证信息，防止泄漏到下一个请求
        SecurityContextHolder.clearContext();
      }
    });
  };
}

/**
 * 获取守卫注册表
 * @param container - DI 容器
 * @returns 守卫注册表实例
 */
export function getGuardRegistry(container: Container): GuardRegistry {
  if (container.isRegistered(GUARD_REGISTRY_TOKEN)) {
    return container.resolve<GuardRegistry>(GUARD_REGISTRY_TOKEN);
  }
  const registry = new GuardRegistry();
  container.registerInstance(GUARD_REGISTRY_TOKEN, registry);
  return registry;
}

/**
 * 注册 Reflector 到 DI 容器
 * @param container - DI 容器
 * @returns Reflector 实例
 */
export function registerReflector(container: Container): Reflector {
  if (container.isRegistered(REFLECTOR_TOKEN)) {
    return container.resolve<Reflector>(REFLECTOR_TOKEN);
  }
  const reflector = new Reflector();
  container.registerInstance(REFLECTOR_TOKEN, reflector);
  return reflector;
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
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
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

