import type {
  Authentication,
  AuthenticationProvider,
  AuthenticationRequest,
  Principal,
} from '../types';
import { OAuth2Service } from '../../auth/oauth2';
import type { OAuth2TokenRequest, UserInfo } from '../../auth/types';

/**
 * OAuth2 认证提供者
 */
export class OAuth2AuthenticationProvider implements AuthenticationProvider {
  public readonly supportedTypes = ['oauth2', 'authorization_code'];

  public constructor(private readonly oauth2Service: OAuth2Service) {}

  /**
   * 是否支持该认证类型
   */
  public supports(type: string): boolean {
    return this.supportedTypes.includes(type.toLowerCase());
  }

  /**
   * 认证（通过授权码交换令牌）
   */
  public async authenticate(
    request: AuthenticationRequest,
  ): Promise<Authentication | null> {
    const credentials = request.credentials as OAuth2TokenRequest;
    if (!credentials || credentials.grantType !== 'authorization_code') {
      return null;
    }

    // 交换授权码获取令牌
    const tokenResponse = await this.oauth2Service.exchangeCodeForToken(credentials);
    if (!tokenResponse) {
      return null;
    }

    // 从访问令牌中提取用户信息
    // 注意：这里简化处理，实际应该解析 JWT 或查询用户服务
    const userInfo: UserInfo = {
      id: 'user-1', // 应该从令牌或用户服务获取
      username: 'user',
      roles: ['user'],
    };

    const principal: Principal = {
      id: userInfo.id,
      username: userInfo.username,
      roles: userInfo.roles,
    };

    return {
      authenticated: true,
      principal,
      credentials: {
        type: 'oauth2',
        data: tokenResponse,
      },
      authorities: principal.roles || [],
      details: tokenResponse,
    };
  }
}

