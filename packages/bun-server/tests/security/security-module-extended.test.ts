import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import 'reflect-metadata';

import { SecurityModule } from '../../src/security/security-module';
import { MODULE_METADATA_KEY } from '../../src/di/module';
import { GuardRegistry } from '../../src/security/guards/guard-registry';
import { JWT_UTIL_TOKEN, OAUTH2_SERVICE_TOKEN } from '../../src/auth/controller';
import { GUARD_REGISTRY_TOKEN, type Guard, type ExecutionContext } from '../../src/security/guards/types';
import { REFLECTOR_TOKEN } from '../../src/security/guards/reflector';

describe('SecurityModule', () => {
  beforeEach(() => {
    SecurityModule.reset();
  });

  afterEach(() => {
    SecurityModule.reset();
  });

  describe('forRoot', () => {
    test('should create module with JWT config', () => {
      SecurityModule.forRoot({
        jwt: {
          secret: 'test-secret',
          accessTokenExpiresIn: 3600,
        },
      });

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
      expect(metadata.providers).toBeDefined();
      expect(metadata.exports).toContain(JWT_UTIL_TOKEN);
    });

    test('should create module with OAuth2 config', () => {
      SecurityModule.forRoot({
        jwt: { secret: 'secret' },
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
      expect(metadata.exports).toContain(OAUTH2_SERVICE_TOKEN);
    });

    test('should register guard registry', () => {
      SecurityModule.forRoot({
        jwt: { secret: 'secret' },
      });

      const guardRegistry = SecurityModule.getGuardRegistry();
      expect(guardRegistry).toBeInstanceOf(GuardRegistry);
    });

    test('should export guard registry and reflector', () => {
      SecurityModule.forRoot({
        jwt: { secret: 'secret' },
      });

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
      expect(metadata.exports).toContain(GUARD_REGISTRY_TOKEN);
      expect(metadata.exports).toContain(REFLECTOR_TOKEN);
    });

    test('should support exclude paths', () => {
      SecurityModule.forRoot({
        jwt: { secret: 'secret' },
        excludePaths: ['/public', '/health'],
      });

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
      expect(metadata.middlewares.length).toBeGreaterThan(0);
    });
  });

  describe('getGuardRegistry', () => {
    test('should return null before forRoot', () => {
      const registry = SecurityModule.getGuardRegistry();
      expect(registry).toBeNull();
    });

    test('should return registry after forRoot', () => {
      SecurityModule.forRoot({ jwt: { secret: 'secret' } });
      const registry = SecurityModule.getGuardRegistry();
      expect(registry).not.toBeNull();
    });
  });

  describe('addGlobalGuards', () => {
    test('should add guards to registry', () => {
      SecurityModule.forRoot({ jwt: { secret: 'secret' } });

      class TestGuard implements Guard {
        public async canActivate(context: ExecutionContext): Promise<boolean> {
          return true;
        }
      }

      SecurityModule.addGlobalGuards(TestGuard);

      const registry = SecurityModule.getGuardRegistry();
      expect(registry).not.toBeNull();
    });

    test('should not throw when registry not initialized', () => {
      class TestGuard implements Guard {
        public async canActivate(context: ExecutionContext): Promise<boolean> {
          return true;
        }
      }

      expect(() => SecurityModule.addGlobalGuards(TestGuard)).not.toThrow();
    });
  });

  describe('reset', () => {
    test('should clear registry and metadata', () => {
      SecurityModule.forRoot({ jwt: { secret: 'secret' } });
      expect(SecurityModule.getGuardRegistry()).not.toBeNull();

      SecurityModule.reset();

      expect(SecurityModule.getGuardRegistry()).toBeNull();
      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule);
      expect(metadata).toBeUndefined();
    });
  });
});
