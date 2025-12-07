import type { Authentication, AccessDecisionManager } from './types';

/**
 * 基于角色的访问决策器
 */
export class RoleBasedAccessDecisionManager implements AccessDecisionManager {
  /**
   * 决定是否授权
   * @param authentication - 认证信息
   * @param requiredAuthorities - 需要的权限（角色）
   * @returns 是否授权
   */
  public decide(
    authentication: Authentication,
    requiredAuthorities: string[],
  ): boolean {
    // 如果没有要求权限，则允许访问
    if (requiredAuthorities.length === 0) {
      return true;
    }

    // 如果未认证，拒绝访问
    if (!authentication.authenticated) {
      return false;
    }

    // 检查是否有足够的权限
    const userAuthorities = authentication.authorities || [];
    return requiredAuthorities.some((required) =>
      userAuthorities.includes(required),
    );
  }
}

