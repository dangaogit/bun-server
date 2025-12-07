import type {
  Authentication,
  AuthenticationProvider,
  AuthenticationRequest,
  Principal,
} from '../types';
import { JWTUtil } from '../../auth/jwt';

/**
 * JWT 认证提供者
 */
export class JwtAuthenticationProvider implements AuthenticationProvider {
  public readonly supportedTypes = ['jwt', 'bearer'];

  public constructor(private readonly jwtUtil: JWTUtil) {}

  /**
   * 是否支持该认证类型
   */
  public supports(type: string): boolean {
    return this.supportedTypes.includes(type.toLowerCase());
  }

  /**
   * 认证
   */
  public async authenticate(
    request: AuthenticationRequest,
  ): Promise<Authentication | null> {
    const token = request.credentials as string;
    if (!token) {
      return null;
    }

    // 验证 JWT 令牌
    const payload = this.jwtUtil.verify(token);
    if (!payload) {
      return null;
    }

    // 构建主体
    const principal: Principal = {
      id: payload.sub,
      username: (payload.username as string) || payload.sub,
      roles: (payload.roles as string[]) || [],
    };

    // 构建权限列表（从角色转换）
    const authorities = principal.roles || [];

    return {
      authenticated: true,
      principal,
      credentials: { type: 'jwt', data: token },
      authorities,
      details: payload,
    };
  }
}

