/**
 * Security 核心类型定义
 */

/**
 * 认证主体（Principal）
 */
export interface Principal {
  /**
   * 用户 ID
   */
  id: string;
  /**
   * 用户名
   */
  username?: string;
  /**
   * 角色列表
   */
  roles?: string[];
  /**
   * 其他属性
   */
  [key: string]: unknown;
}

/**
 * 认证凭据（Credentials）
 */
export interface Credentials {
  /**
   * 凭据类型
   */
  type: string;
  /**
   * 凭据数据
   */
  data: unknown;
}

/**
 * 认证信息
 */
export interface Authentication {
  /**
   * 是否已认证
   */
  authenticated: boolean;
  /**
   * 主体
   */
  principal: Principal | null;
  /**
   * 凭据
   */
  credentials: Credentials | null;
  /**
   * 权限列表
   */
  authorities: string[];
  /**
   * 详细信息
   */
  details?: unknown;
}

/**
 * 认证请求
 */
export interface AuthenticationRequest {
  /**
   * 主体标识（如用户名）
   */
  principal: string;
  /**
   * 凭据（如密码）
   */
  credentials: unknown;
  /**
   * 认证类型
   */
  type?: string;
}

/**
 * 认证提供者接口
 */
export interface AuthenticationProvider {
  /**
   * 支持的认证类型
   */
  readonly supportedTypes: string[];

  /**
   * 认证
   * @param request - 认证请求
   * @returns 认证信息
   */
  authenticate(request: AuthenticationRequest): Promise<Authentication | null>;

  /**
   * 是否支持该认证类型
   * @param type - 认证类型
   */
  supports(type: string): boolean;
}

/**
 * 授权决策器接口
 */
export interface AccessDecisionManager {
  /**
   * 决定是否授权
   * @param authentication - 认证信息
   * @param requiredAuthorities - 需要的权限
   * @returns 是否授权
   */
  decide(
    authentication: Authentication,
    requiredAuthorities: string[],
  ): boolean;
}

/**
 * 安全配置
 */
export interface SecurityConfig {
  /**
   * 是否启用安全
   * @default true
   */
  enabled?: boolean;
  /**
   * 排除的路径列表
   */
  excludePaths?: string[];
  /**
   * 默认认证要求
   * @default true
   */
  defaultAuthRequired?: boolean;
}

/**
 * 安全上下文
 */
export interface SecurityContext {
  /**
   * 当前认证信息
   */
  authentication: Authentication | null;
  /**
   * 是否已认证
   */
  isAuthenticated(): boolean;
  /**
   * 获取主体
   */
  getPrincipal(): Principal | null;
  /**
   * 获取权限
   */
  getAuthorities(): string[];
}

