/**
 * 认证相关类型定义
 */

/**
 * JWT 载荷
 */
export interface JWTPayload {
  /**
   * 用户 ID
   */
  sub: string;
  /**
   * 用户名
   */
  username?: string;
  /**
   * 角色列表
   */
  roles?: string[];
  /**
   * 过期时间（Unix 时间戳）
   */
  exp?: number;
  /**
   * 签发时间（Unix 时间戳）
   */
  iat?: number;
  /**
   * 其他自定义字段
   */
  [key: string]: unknown;
}

/**
 * JWT 配置
 */
export interface JWTConfig {
  /**
   * 密钥（用于签名和验证）
   */
  secret: string;
  /**
   * 访问令牌过期时间（秒）
   * @default 3600 (1 hour)
   */
  accessTokenExpiresIn?: number;
  /**
   * 刷新令牌过期时间（秒）
   * @default 86400 * 7 (7 days)
   */
  refreshTokenExpiresIn?: number;
  /**
   * 算法
   * @default 'HS256'
   */
  algorithm?: 'HS256' | 'HS384' | 'HS512';
}

/**
 * OAuth2 授权码配置
 */
export interface OAuth2CodeConfig {
  /**
   * 授权码过期时间（秒）
   * @default 600 (10 minutes)
   */
  expiresIn?: number;
  /**
   * 授权码长度
   * @default 32
   */
  length?: number;
}

/**
 * OAuth2 客户端配置
 */
export interface OAuth2Client {
  /**
   * 客户端 ID
   */
  clientId: string;
  /**
   * 客户端密钥
   */
  clientSecret: string;
  /**
   * 重定向 URI 列表
   */
  redirectUris: string[];
  /**
   * 允许的授权类型
   */
  grantTypes: ('authorization_code' | 'refresh_token')[];
}

/**
 * OAuth2 授权请求
 */
export interface OAuth2AuthorizationRequest {
  /**
   * 客户端 ID
   */
  clientId: string;
  /**
   * 重定向 URI
   */
  redirectUri: string;
  /**
   * 响应类型
   */
  responseType: 'code';
  /**
   * 作用域（可选）
   */
  scope?: string;
  /**
   * 状态（用于 CSRF 防护）
   */
  state?: string;
}

/**
 * OAuth2 令牌请求
 */
export interface OAuth2TokenRequest {
  /**
   * 授权码
   */
  code: string;
  /**
   * 客户端 ID
   */
  clientId: string;
  /**
   * 客户端密钥
   */
  clientSecret: string;
  /**
   * 重定向 URI
   */
  redirectUri: string;
  /**
   * 授权类型
   */
  grantType: 'authorization_code' | 'refresh_token';
  /**
   * 刷新令牌（用于 refresh_token 授权类型）
   */
  refreshToken?: string;
}

/**
 * OAuth2 令牌响应
 */
export interface OAuth2TokenResponse {
  /**
   * 访问令牌
   */
  accessToken: string;
  /**
   * 令牌类型
   */
  tokenType: 'Bearer';
  /**
   * 过期时间（秒）
   */
  expiresIn: number;
  /**
   * 刷新令牌
   */
  refreshToken?: string;
  /**
   * 作用域
   */
  scope?: string;
}

/**
 * 认证模块配置（已废弃，请使用 SecurityModuleConfig）
 * @deprecated 使用 SecurityModule.forRoot() 替代
 */
export interface AuthModuleOptions {
  /**
   * JWT 配置
   */
  jwt: JWTConfig;
  /**
   * OAuth2 客户端列表
   */
  clients?: OAuth2Client[];
  /**
   * 授权码配置
   */
  codeConfig?: OAuth2CodeConfig;
  /**
   * 是否启用 OAuth2 端点
   * @default true
   */
  enableOAuth2Endpoints?: boolean;
  /**
   * OAuth2 端点前缀
   * @default '/oauth2'
   */
  oauth2Prefix?: string;
}

/**
 * 用户信息
 */
export interface UserInfo {
  /**
   * 用户 ID
   */
  id: string;
  /**
   * 用户名
   */
  username: string;
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
 * 认证上下文（附加到 Context）
 */
export interface AuthContext {
  /**
   * 用户信息
   */
  user?: UserInfo;
  /**
   * JWT 载荷
   */
  payload?: JWTPayload;
  /**
   * 是否已认证
   */
  isAuthenticated: boolean;
}

