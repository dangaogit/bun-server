import { describe, expect, test, afterEach, beforeEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { SecurityModule } from '../../src/security/security-module';
import { Controller } from '../../src/controller';
import { GET } from '../../src/router/decorators';
import { Auth } from '../../src/auth/decorators';
import { RouteRegistry } from '../../src/router/registry';
import { ControllerRegistry } from '../../src/controller/controller';
import { ModuleRegistry } from '../../src/di/module-registry';
import { SecurityContextHolder } from '../../src/security/context';
import { MODULE_METADATA_KEY } from '../../src/di/module';
import { getTestPort } from '../utils/test-port';

/**
 * 测试用的受保护控制器
 */
@Controller('/api/protected')
class ProtectedController {
  @GET('/profile')
  @Auth()
  public getProfile() {
    const context = SecurityContextHolder.getContext();
    const principal = context.getPrincipal();
    return {
      id: principal?.id,
      username: principal?.username,
      roles: principal?.roles,
    };
  }

  @GET('/admin')
  @Auth({ roles: ['admin'] })
  public getAdmin() {
    return { message: 'Admin access granted' };
  }
}

describe('OAuth2 E2E Integration Tests', () => {
  let app: Application;
  let port: number;
  const baseUrl = () => `http://localhost:${port}`;

  const oauth2Client = {
    clientId: 'test-client',
    clientSecret: 'test-secret',
    redirectUris: ['http://localhost:3000/callback'],
    grantTypes: ['authorization_code', 'refresh_token'] as ('authorization_code' | 'refresh_token')[],
  };

  beforeEach(() => {
    port = getTestPort();
    SecurityContextHolder.clearContext();
    // 清除 SecurityModule 元数据，避免测试间污染
    Reflect.deleteMetadata(MODULE_METADATA_KEY, SecurityModule);
  });

  afterEach(async () => {
    if (app) {
      await app.stop();
    }
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
    ModuleRegistry.getInstance().clear();
    SecurityContextHolder.clearContext();
    // 清除 SecurityModule 元数据
    Reflect.deleteMetadata(MODULE_METADATA_KEY, SecurityModule);
  });

  test('should complete full OAuth2 authorization code flow', async () => {
    // 1. 创建应用并注册 SecurityModule
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
    });
    app.registerModule(SecurityModule);
    app.registerController(ProtectedController);
    await app.listen();

    // 2. 请求授权端点
    const authorizeUrl = new URL(`${baseUrl()}/oauth2/authorize`);
    authorizeUrl.searchParams.set('client_id', oauth2Client.clientId);
    authorizeUrl.searchParams.set('redirect_uri', oauth2Client.redirectUris[0]);
    authorizeUrl.searchParams.set('response_type', 'code');
    authorizeUrl.searchParams.set('state', 'test-state');

    const authorizeResponse = await fetch(authorizeUrl.toString(), {
      redirect: 'manual', // 不自动跟随重定向
    });

    // 3. 验证授权响应（应该是重定向）
    expect(authorizeResponse.status).toBe(302);
    const location = authorizeResponse.headers.get('location');
    expect(location).toBeDefined();
    expect(location).not.toBeNull();
    expect(location).toContain('code=');
    expect(location).toContain('state=test-state');

    // 4. 从重定向 URL 中提取授权码
    const redirectUrl = new URL(location!);
    const code = redirectUrl.searchParams.get('code');
    expect(code).toBeDefined();

    // 5. 使用授权码交换访问令牌
    const tokenResponse = await fetch(`${baseUrl()}/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: oauth2Client.clientId,
        client_secret: oauth2Client.clientSecret,
        redirect_uri: oauth2Client.redirectUris[0],
      }),
    });

    expect(tokenResponse.status).toBe(200);
    const tokenData = (await tokenResponse.json()) as {
      accessToken: string;
      tokenType: string;
      refreshToken?: string;
      expiresIn: number;
    };
    expect(tokenData.accessToken).toBeDefined();
    expect(tokenData.tokenType).toBe('Bearer');
    expect(tokenData.refreshToken).toBeDefined();
    expect(tokenData.expiresIn).toBe(3600);

    // 6. 使用访问令牌访问受保护资源
    const profileResponse = await fetch(`${baseUrl()}/api/protected/profile`, {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
      },
    });

    expect(profileResponse.status).toBe(200);
    const profileData = (await profileResponse.json()) as {
      id: string;
      username?: string;
      roles?: string[];
    };
    expect(profileData.id).toBe('user-1');
    expect(profileData.username).toBeDefined();
  });

  test('should handle refresh token flow', async () => {
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
        refreshTokenExpiresIn: 86400,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
    });
    app.registerModule(SecurityModule);
    app.registerController(ProtectedController);
    await app.listen();

    // 1. 获取初始访问令牌和刷新令牌
    const authorizeUrl = new URL(`${baseUrl()}/oauth2/authorize`);
    authorizeUrl.searchParams.set('client_id', oauth2Client.clientId);
    authorizeUrl.searchParams.set('redirect_uri', oauth2Client.redirectUris[0]);
    authorizeUrl.searchParams.set('response_type', 'code');

    const authorizeResponse = await fetch(authorizeUrl.toString(), {
      redirect: 'manual',
    });
    expect(authorizeResponse.status).toBe(302);
    const location = authorizeResponse.headers.get('location');
    expect(location).not.toBeNull();
    if (!location) {
      throw new Error('Location header is null');
    }
    const code = new URL(location!).searchParams.get('code');
    expect(code).toBeDefined();

    const tokenResponse = await fetch(`${baseUrl()}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: oauth2Client.clientId,
        client_secret: oauth2Client.clientSecret,
        redirect_uri: oauth2Client.redirectUris[0],
      }),
    });

    const tokenData = (await tokenResponse.json()) as {
      accessToken: string;
      refreshToken?: string;
    };
    const refreshToken = tokenData.refreshToken;

    // 2. 使用刷新令牌获取新的访问令牌
    const refreshResponse = await fetch(`${baseUrl()}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: oauth2Client.clientId,
        client_secret: oauth2Client.clientSecret,
      }),
    });

    expect(refreshResponse.status).toBe(200);
    const newTokenData = (await refreshResponse.json()) as {
      accessToken: string;
      refreshToken?: string;
    };
    expect(newTokenData.accessToken).toBeDefined();
    expect(newTokenData.refreshToken).toBeDefined();
    // 验证新令牌可以用于访问受保护资源
    const profileResponse = await fetch(`${baseUrl()}/api/protected/profile`, {
      headers: {
        Authorization: `Bearer ${newTokenData.accessToken}`,
      },
    });
    expect(profileResponse.status).toBe(200);
    // 刷新令牌应该生成新的刷新令牌（即使访问令牌可能因为时间戳相同而相同）
    expect(newTokenData.refreshToken).toBeDefined();
  });

  test('should reject invalid authorization code', async () => {
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
    });
    app.registerModule(SecurityModule);
    await app.listen();

    const tokenResponse = await fetch(`${baseUrl()}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: 'invalid-code',
        client_id: oauth2Client.clientId,
        client_secret: oauth2Client.clientSecret,
        redirect_uri: oauth2Client.redirectUris[0],
      }),
    });

    expect(tokenResponse.status).toBe(200);
    const errorData = (await tokenResponse.json()) as {
      error: string;
      error_description?: string;
    };
    expect(errorData.error).toBe('invalid_grant');
    expect(errorData.error_description).toBeDefined();
  });

  test('should reject invalid client credentials', async () => {
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
    });
    app.registerModule(SecurityModule);
    await app.listen();

    // 获取有效的授权码
    const authorizeUrl = new URL(`${baseUrl()}/oauth2/authorize`);
    authorizeUrl.searchParams.set('client_id', oauth2Client.clientId);
    authorizeUrl.searchParams.set('redirect_uri', oauth2Client.redirectUris[0]);
    authorizeUrl.searchParams.set('response_type', 'code');

    const authorizeResponse = await fetch(authorizeUrl.toString(), {
      redirect: 'manual',
    });
    expect(authorizeResponse.status).toBe(302);
    const location = authorizeResponse.headers.get('location');
    expect(location).not.toBeNull();
    if (!location) {
      throw new Error('Location header is null');
    }
    const code = new URL(location!).searchParams.get('code');
    expect(code).toBeDefined();

    // 使用错误的客户端密钥
    const tokenResponse = await fetch(`${baseUrl()}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: oauth2Client.clientId,
        client_secret: 'wrong-secret',
        redirect_uri: oauth2Client.redirectUris[0],
      }),
    });

    expect(tokenResponse.status).toBe(200);
    const errorData = (await tokenResponse.json()) as {
      error: string;
    };
    expect(errorData.error).toBe('invalid_grant');
  });

  test('should reject invalid redirect URI', async () => {
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
    });
    app.registerModule(SecurityModule);
    await app.listen();

    // 获取有效的授权码
    const authorizeUrl = new URL(`${baseUrl()}/oauth2/authorize`);
    authorizeUrl.searchParams.set('client_id', oauth2Client.clientId);
    authorizeUrl.searchParams.set('redirect_uri', oauth2Client.redirectUris[0]);
    authorizeUrl.searchParams.set('response_type', 'code');

    const authorizeResponse = await fetch(authorizeUrl.toString(), {
      redirect: 'manual',
    });
    expect(authorizeResponse.status).toBe(302);
    const location = authorizeResponse.headers.get('location');
    expect(location).not.toBeNull();
    if (!location) {
      throw new Error('Location header is null');
    }
    const code = new URL(location!).searchParams.get('code');
    expect(code).toBeDefined();

    // 使用错误的 redirect_uri
    const tokenResponse = await fetch(`${baseUrl()}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: oauth2Client.clientId,
        client_secret: oauth2Client.clientSecret,
        redirect_uri: 'http://localhost:3000/wrong-callback',
      }),
    });

    expect(tokenResponse.status).toBe(200);
    const errorData = (await tokenResponse.json()) as {
      error: string;
    };
    expect(errorData.error).toBe('invalid_grant');
  });

  test('should reject unauthorized access to protected resource', async () => {
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
      defaultAuthRequired: true,
    });
    app.registerModule(SecurityModule);
    app.registerController(ProtectedController);
    await app.listen();

    // 尝试访问受保护资源而不提供令牌
    const response = await fetch(`${baseUrl()}/api/protected/profile`);

    expect(response.status).toBe(401);
    const errorData = (await response.json()) as {
      error?: string;
    };
    expect(errorData.error).toBeDefined();
  });

  test('should reject access with invalid token', async () => {
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
      defaultAuthRequired: true,
    });
    app.registerModule(SecurityModule);
    app.registerController(ProtectedController);
    await app.listen();

    // 使用无效的令牌访问受保护资源
    const response = await fetch(`${baseUrl()}/api/protected/profile`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    expect(response.status).toBe(401);
  });

  test('should enforce role-based access control', async () => {
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
    });
    app.registerModule(SecurityModule);
    app.registerController(ProtectedController);
    await app.listen();

    // 获取访问令牌（用户默认没有 admin 角色）
    const authorizeUrl = new URL(`${baseUrl()}/oauth2/authorize`);
    authorizeUrl.searchParams.set('client_id', oauth2Client.clientId);
    authorizeUrl.searchParams.set('redirect_uri', oauth2Client.redirectUris[0]);
    authorizeUrl.searchParams.set('response_type', 'code');

    const authorizeResponse = await fetch(authorizeUrl.toString(), {
      redirect: 'manual',
    });
    expect(authorizeResponse.status).toBe(302);
    const location = authorizeResponse.headers.get('location');
    expect(location).not.toBeNull();
    if (!location) {
      throw new Error('Location header is null');
    }
    const code = new URL(location!).searchParams.get('code');
    expect(code).toBeDefined();

    const tokenResponse = await fetch(`${baseUrl()}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: oauth2Client.clientId,
        client_secret: oauth2Client.clientSecret,
        redirect_uri: oauth2Client.redirectUris[0],
      }),
    });

    const tokenData = (await tokenResponse.json()) as {
      accessToken: string;
    };

    // 尝试访问需要 admin 角色的资源
    const adminResponse = await fetch(`${baseUrl()}/api/protected/admin`, {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
      },
    });

    expect(adminResponse.status).toBe(403);
    const errorData = (await adminResponse.json()) as {
      error?: string;
    };
    expect(errorData.error).toBeDefined();
  });

  test('should handle authorization request with invalid client', async () => {
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
    });
    app.registerModule(SecurityModule);
    await app.listen();

    const authorizeUrl = new URL(`${baseUrl()}/oauth2/authorize`);
    authorizeUrl.searchParams.set('client_id', 'invalid-client');
    authorizeUrl.searchParams.set('redirect_uri', oauth2Client.redirectUris[0]);
    authorizeUrl.searchParams.set('response_type', 'code');

    const response = await fetch(authorizeUrl.toString(), {
      redirect: 'manual',
    });

    // 应该返回错误（可能是 500 或重定向到错误页面）
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should handle authorization request with invalid redirect URI', async () => {
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
    });
    app.registerModule(SecurityModule);
    await app.listen();

    const authorizeUrl = new URL(`${baseUrl()}/oauth2/authorize`);
    authorizeUrl.searchParams.set('client_id', oauth2Client.clientId);
    authorizeUrl.searchParams.set('redirect_uri', 'http://evil.com/callback');
    authorizeUrl.searchParams.set('response_type', 'code');

    const response = await fetch(authorizeUrl.toString(), {
      redirect: 'manual',
    });

    // 应该返回错误
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  test('should support user provider for custom user info', async () => {
    app = new Application({ port });
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret-key',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [oauth2Client],
      enableOAuth2Endpoints: true,
      userProvider: {
        async findById(userId: string) {
          return {
            id: userId,
            username: 'custom-user',
            roles: ['user', 'admin'],
          };
        },
      },
    });
    app.registerModule(SecurityModule);
    app.registerController(ProtectedController);
    await app.listen();

    // 获取访问令牌
    const authorizeUrl = new URL(`${baseUrl()}/oauth2/authorize`);
    authorizeUrl.searchParams.set('client_id', oauth2Client.clientId);
    authorizeUrl.searchParams.set('redirect_uri', oauth2Client.redirectUris[0]);
    authorizeUrl.searchParams.set('response_type', 'code');

    const authorizeResponse = await fetch(authorizeUrl.toString(), {
      redirect: 'manual',
    });
    expect(authorizeResponse.status).toBe(302);
    const location = authorizeResponse.headers.get('location');
    expect(location).not.toBeNull();
    if (!location) {
      throw new Error('Location header is null');
    }
    const code = new URL(location!).searchParams.get('code');
    expect(code).toBeDefined();

    const tokenResponse = await fetch(`${baseUrl()}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code,
        client_id: oauth2Client.clientId,
        client_secret: oauth2Client.clientSecret,
        redirect_uri: oauth2Client.redirectUris[0],
      }),
    });

    const tokenData = (await tokenResponse.json()) as {
      accessToken: string;
    };

    // 访问受保护资源，应该包含自定义用户信息
    const profileResponse = await fetch(`${baseUrl()}/api/protected/profile`, {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
      },
    });

    expect(profileResponse.status).toBe(200);
    const profileData = (await profileResponse.json()) as {
      username?: string;
      roles?: string[];
    };
    expect(profileData.username).toBe('custom-user');
    expect(profileData.roles).toContain('admin');

    // 应该能够访问 admin 资源
    const adminResponse = await fetch(`${baseUrl()}/api/protected/admin`, {
      headers: {
        Authorization: `Bearer ${tokenData.accessToken}`,
      },
    });

    expect(adminResponse.status).toBe(200);
  });
});
