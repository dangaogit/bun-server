import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  Auth,
  getAuthMetadata,
  requiresAuth,
  checkRoles,
  type AuthConfig,
} from '../../src/auth/decorators';

describe('Auth Decorator', () => {
  describe('@Auth', () => {
    test('should set auth metadata with default options', () => {
      class TestController {
        @Auth()
        public protectedMethod(): void {}
      }

      const metadata = getAuthMetadata(TestController.prototype, 'protectedMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.required).toBe(true);
      expect(metadata?.roles).toEqual([]);
      expect(metadata?.allowAnonymous).toBe(false);
    });

    test('should set auth metadata with required=false', () => {
      class TestController {
        @Auth({ required: false })
        public optionalAuthMethod(): void {}
      }

      const metadata = getAuthMetadata(TestController.prototype, 'optionalAuthMethod');
      expect(metadata?.required).toBe(false);
    });

    test('should set auth metadata with roles', () => {
      class TestController {
        @Auth({ roles: ['admin', 'moderator'] })
        public adminMethod(): void {}
      }

      const metadata = getAuthMetadata(TestController.prototype, 'adminMethod');
      expect(metadata?.roles).toEqual(['admin', 'moderator']);
    });

    test('should set auth metadata with allowAnonymous', () => {
      class TestController {
        @Auth({ allowAnonymous: true })
        public publicMethod(): void {}
      }

      const metadata = getAuthMetadata(TestController.prototype, 'publicMethod');
      expect(metadata?.allowAnonymous).toBe(true);
    });

    test('should set all options together', () => {
      const config: AuthConfig = {
        required: true,
        roles: ['admin'],
        allowAnonymous: false,
      };

      class TestController {
        @Auth(config)
        public fullConfigMethod(): void {}
      }

      const metadata = getAuthMetadata(TestController.prototype, 'fullConfigMethod');
      expect(metadata?.required).toBe(true);
      expect(metadata?.roles).toEqual(['admin']);
      expect(metadata?.allowAnonymous).toBe(false);
    });

    test('should handle multiple methods with different configs', () => {
      class TestController {
        @Auth({ roles: ['admin'] })
        public adminMethod(): void {}

        @Auth({ roles: ['user'] })
        public userMethod(): void {}

        @Auth({ allowAnonymous: true })
        public publicMethod(): void {}
      }

      const adminMetadata = getAuthMetadata(TestController.prototype, 'adminMethod');
      const userMetadata = getAuthMetadata(TestController.prototype, 'userMethod');
      const publicMetadata = getAuthMetadata(TestController.prototype, 'publicMethod');

      expect(adminMetadata?.roles).toEqual(['admin']);
      expect(userMetadata?.roles).toEqual(['user']);
      expect(publicMetadata?.allowAnonymous).toBe(true);
    });
  });

  describe('getAuthMetadata', () => {
    test('should return undefined for non-decorated method', () => {
      class TestController {
        public normalMethod(): void {}
      }

      const metadata = getAuthMetadata(TestController.prototype, 'normalMethod');
      expect(metadata).toBeUndefined();
    });

    test('should return metadata for decorated method', () => {
      class TestController {
        @Auth({ roles: ['admin'] })
        public protectedMethod(): void {}
      }

      const metadata = getAuthMetadata(TestController.prototype, 'protectedMethod');
      expect(metadata).toBeDefined();
      expect(metadata?.roles).toEqual(['admin']);
    });
  });

  describe('requiresAuth', () => {
    test('should return false for non-decorated method', () => {
      class TestController {
        public normalMethod(): void {}
      }

      const requires = requiresAuth(TestController.prototype, 'normalMethod');
      expect(requires).toBe(false);
    });

    test('should return true for decorated method with default config', () => {
      class TestController {
        @Auth()
        public protectedMethod(): void {}
      }

      const requires = requiresAuth(TestController.prototype, 'protectedMethod');
      expect(requires).toBe(true);
    });

    test('should return true when required is explicitly true', () => {
      class TestController {
        @Auth({ required: true })
        public protectedMethod(): void {}
      }

      const requires = requiresAuth(TestController.prototype, 'protectedMethod');
      expect(requires).toBe(true);
    });

    test('should return false when required is false', () => {
      class TestController {
        @Auth({ required: false })
        public optionalMethod(): void {}
      }

      const requires = requiresAuth(TestController.prototype, 'optionalMethod');
      expect(requires).toBe(false);
    });
  });

  describe('checkRoles', () => {
    test('should return true when no roles required', () => {
      class TestController {
        @Auth()
        public anyAuthMethod(): void {}
      }

      const hasAccess = checkRoles(TestController.prototype, 'anyAuthMethod', ['user']);
      expect(hasAccess).toBe(true);
    });

    test('should return true when roles is empty array', () => {
      class TestController {
        @Auth({ roles: [] })
        public anyAuthMethod(): void {}
      }

      const hasAccess = checkRoles(TestController.prototype, 'anyAuthMethod', ['user']);
      expect(hasAccess).toBe(true);
    });

    test('should return true when user has required role', () => {
      class TestController {
        @Auth({ roles: ['admin'] })
        public adminMethod(): void {}
      }

      const hasAccess = checkRoles(TestController.prototype, 'adminMethod', ['admin']);
      expect(hasAccess).toBe(true);
    });

    test('should return true when user has one of required roles', () => {
      class TestController {
        @Auth({ roles: ['admin', 'moderator'] })
        public modMethod(): void {}
      }

      const hasAccess = checkRoles(TestController.prototype, 'modMethod', ['moderator']);
      expect(hasAccess).toBe(true);
    });

    test('should return false when user lacks required role', () => {
      class TestController {
        @Auth({ roles: ['admin'] })
        public adminMethod(): void {}
      }

      const hasAccess = checkRoles(TestController.prototype, 'adminMethod', ['user']);
      expect(hasAccess).toBe(false);
    });

    test('should return false when user has no roles', () => {
      class TestController {
        @Auth({ roles: ['admin'] })
        public adminMethod(): void {}
      }

      const hasAccess = checkRoles(TestController.prototype, 'adminMethod', []);
      expect(hasAccess).toBe(false);
    });

    test('should return true for non-decorated method', () => {
      class TestController {
        public normalMethod(): void {}
      }

      const hasAccess = checkRoles(TestController.prototype, 'normalMethod', []);
      expect(hasAccess).toBe(true);
    });

    test('should handle default empty userRoles parameter', () => {
      class TestController {
        @Auth({ roles: ['admin'] })
        public adminMethod(): void {}
      }

      // checkRoles 默认参数为空数组
      const hasAccess = checkRoles(TestController.prototype, 'adminMethod');
      expect(hasAccess).toBe(false);
    });
  });
});
