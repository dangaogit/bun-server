import type {
  Authentication,
  AuthenticationProvider,
  AuthenticationRequest,
} from './types';

/**
 * 认证管理器
 */
export class AuthenticationManager {
  private readonly providers: AuthenticationProvider[] = [];

  /**
   * 注册认证提供者
   */
  public registerProvider(provider: AuthenticationProvider): void {
    this.providers.push(provider);
  }

  /**
   * 认证
   * @param request - 认证请求
   * @returns 认证信息
   */
  public async authenticate(
    request: AuthenticationRequest,
  ): Promise<Authentication | null> {
    const type = request.type || 'default';

    // 查找支持的提供者
    const provider = this.providers.find((p) => p.supports(type));

    if (!provider) {
      throw new Error(`No authentication provider found for type: ${type}`);
    }

    return await provider.authenticate(request);
  }

  /**
   * 获取所有提供者
   */
  public getProviders(): AuthenticationProvider[] {
    return [...this.providers];
  }
}

