import { describe, expect, test, beforeEach } from 'bun:test';
import { SecurityModule } from '../../src/security/security-module';
import { MODULE_METADATA_KEY } from '../../src/di/module';
import { JWT_UTIL_TOKEN, OAUTH2_SERVICE_TOKEN } from '../../src/auth/controller';
import { AuthenticationManager } from '../../src/security/authentication-manager';
import 'reflect-metadata';

describe('SecurityModule', () => {
  beforeEach(() => {
    // 重置模块状态（包括清除元数据和守卫注册表）
    SecurityModule.reset();
  });

  test('should create module with forRoot', () => {
    const module = SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret',
        accessTokenExpiresIn: 3600,
      },
    });

    expect(module).toBe(SecurityModule);
  });

  test('should register JWT and OAuth2 services', () => {
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret',
        accessTokenExpiresIn: 3600,
      },
      oauth2Clients: [
        {
          clientId: 'test-client',
          clientSecret: 'test-secret',
          redirectUris: ['http://localhost/callback'],
          grantTypes: ['authorization_code'],
        },
      ],
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
    expect(metadata).toBeDefined();
    expect(metadata.providers).toBeDefined();

    const jwtProvider = metadata.providers.find(
      (p: any) => p.provide === JWT_UTIL_TOKEN,
    );
    expect(jwtProvider).toBeDefined();

    const oauth2Provider = metadata.providers.find(
      (p: any) => p.provide === OAUTH2_SERVICE_TOKEN,
    );
    expect(oauth2Provider).toBeDefined();

    const authManagerProvider = metadata.providers.find(
      (p: any) => p.provide === AuthenticationManager,
    );
    expect(authManagerProvider).toBeDefined();
  });

  test('should register security filter middleware', () => {
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret',
        accessTokenExpiresIn: 3600,
      },
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
    expect(metadata.middlewares).toBeDefined();
    expect(metadata.middlewares.length).toBeGreaterThan(0);
  });

  test('should register OAuth2 controller when enabled', () => {
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret',
        accessTokenExpiresIn: 3600,
      },
      enableOAuth2Endpoints: true,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
    expect(metadata.controllers).toBeDefined();
    expect(metadata.controllers.length).toBeGreaterThan(0);
  });

  test('should not register OAuth2 controller when disabled', () => {
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret',
        accessTokenExpiresIn: 3600,
      },
      enableOAuth2Endpoints: false,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
    expect(metadata.controllers).toBeDefined();
    expect(metadata.controllers.length).toBe(0);
  });

  test('should export services', () => {
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret',
        accessTokenExpiresIn: 3600,
      },
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
    expect(metadata.exports).toBeDefined();
    expect(metadata.exports).toContain(JWT_UTIL_TOKEN);
    expect(metadata.exports).toContain(OAUTH2_SERVICE_TOKEN);
    expect(metadata.exports).toContain(AuthenticationManager);
  });

  test('should use custom exclude paths', () => {
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret',
        accessTokenExpiresIn: 3600,
      },
      excludePaths: ['/public', '/health'],
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
    expect(metadata).toBeDefined();
  });

  test('should use custom OAuth2 prefix', () => {
    SecurityModule.forRoot({
      jwt: {
        secret: 'test-secret',
        accessTokenExpiresIn: 3600,
      },
      oauth2Prefix: '/auth',
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
    expect(metadata).toBeDefined();
  });
});

