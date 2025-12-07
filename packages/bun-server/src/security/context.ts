import type { Authentication, Principal, SecurityContext } from './types';

/**
 * 安全上下文实现
 */
export class SecurityContextImpl implements SecurityContext {
  private _authentication: Authentication | null = null;

  /**
   * 当前认证信息
   */
  public get authentication(): Authentication | null {
    return this._authentication;
  }

  /**
   * 设置认证信息
   */
  public setAuthentication(authentication: Authentication | null): void {
    this._authentication = authentication;
  }

  /**
   * 是否已认证
   */
  public isAuthenticated(): boolean {
    return this._authentication?.authenticated ?? false;
  }

  /**
   * 获取主体
   */
  public getPrincipal(): Principal | null {
    return this._authentication?.principal ?? null;
  }

  /**
   * 获取权限
   */
  public getAuthorities(): string[] {
    return this._authentication?.authorities ?? [];
  }

  /**
   * 清除认证信息
   */
  public clear(): void {
    this._authentication = null;
  }
}

/**
 * 安全上下文持有者（ThreadLocal 模式）
 */
export class SecurityContextHolder {
  private static readonly contexts = new Map<number, SecurityContextImpl>();

  /**
   * 获取当前上下文
   */
  public static getContext(): SecurityContextImpl {
    const threadId = Bun.main ? 0 : Date.now();
    if (!this.contexts.has(threadId)) {
      this.contexts.set(threadId, new SecurityContextImpl());
    }
    return this.contexts.get(threadId)!;
  }

  /**
   * 清除上下文
   */
  public static clearContext(): void {
    const threadId = Bun.main ? 0 : Date.now();
    this.contexts.delete(threadId);
  }
}

