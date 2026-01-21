import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { OAuth2Service } from '../../src/auth/oauth2';
import { JWTUtil } from '../../src/auth/jwt';
import type { OAuth2Client, UserInfo } from '../../src/auth/types';

describe('OAuth2Service', () => {
  let jwtUtil: JWTUtil;
  let oauth2Service: OAuth2Service;
  let testClient: OAuth2Client;

  beforeEach(() => {
    jwtUtil = new JWTUtil({
      secret: 'test-secret-key-for-oauth2-testing',
      accessTokenExpiresIn: 3600,
      refreshTokenExpiresIn: 86400,
    });

    testClient = {
      clientId: 'test-client',
      clientSecret: 'test-secret',
      redirectUris: ['http://localhost:3000/callback'],
      grantTypes: ['authorization_code'],
      scopes: ['read', 'write'],
    };

    oauth2Service = new OAuth2Service(jwtUtil, [testClient]);
  });

  describe('registerClient', () => {
    test('should register a new client', () => {
      const newClient: OAuth2Client = {
        clientId: 'new-client',
        clientSecret: 'new-secret',
        redirectUris: ['http://example.com/callback'],
        grantTypes: ['authorization_code'],
      };

      oauth2Service.registerClient(newClient);

      // Verify by trying to validate a request with this client
      const result = oauth2Service.validateAuthorizationRequest({
        clientId: 'new-client',
        responseType: 'code',
        redirectUri: 'http://example.com/callback',
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('validateAuthorizationRequest', () => {
    test('should return valid for correct request', () => {
      const result = oauth2Service.validateAuthorizationRequest({
        clientId: 'test-client',
        responseType: 'code',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should return invalid for unknown client', () => {
      const result = oauth2Service.validateAuthorizationRequest({
        clientId: 'unknown-client',
        responseType: 'code',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_client');
    });

    test('should return invalid for unsupported response type', () => {
      const result = oauth2Service.validateAuthorizationRequest({
        clientId: 'test-client',
        responseType: 'token' as any,
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('unsupported_response_type');
    });

    test('should return invalid for wrong redirect uri', () => {
      const result = oauth2Service.validateAuthorizationRequest({
        clientId: 'test-client',
        responseType: 'code',
        redirectUri: 'http://evil.com/callback',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toBe('invalid_redirect_uri');
    });
  });

  describe('generateAuthorizationCode', () => {
    test('should generate a code', () => {
      const code = oauth2Service.generateAuthorizationCode(
        'test-client',
        'http://localhost:3000/callback',
        'user-123',
        'read write',
      );

      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
      expect(code.length).toBe(32);
    });

    test('should generate unique codes', () => {
      const code1 = oauth2Service.generateAuthorizationCode(
        'test-client',
        'http://localhost:3000/callback',
        'user-123',
      );
      const code2 = oauth2Service.generateAuthorizationCode(
        'test-client',
        'http://localhost:3000/callback',
        'user-456',
      );

      expect(code1).not.toBe(code2);
    });
  });

  describe('exchangeCodeForToken', () => {
    test('should exchange valid code for tokens', async () => {
      const code = oauth2Service.generateAuthorizationCode(
        'test-client',
        'http://localhost:3000/callback',
        'user-123',
        'read',
      );

      const result = await oauth2Service.exchangeCodeForToken({
        grantType: 'authorization_code',
        code,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result).not.toBeNull();
      expect(result?.accessToken).toBeDefined();
      expect(result?.refreshToken).toBeDefined();
      expect(result?.tokenType).toBe('Bearer');
      expect(result?.scope).toBe('read');
    });

    test('should return null for wrong grant type', async () => {
      const result = await oauth2Service.exchangeCodeForToken({
        grantType: 'client_credentials' as any,
        code: 'some-code',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result).toBeNull();
    });

    test('should return null for invalid code', async () => {
      const result = await oauth2Service.exchangeCodeForToken({
        grantType: 'authorization_code',
        code: 'invalid-code',
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result).toBeNull();
    });

    test('should return null for wrong client secret', async () => {
      const code = oauth2Service.generateAuthorizationCode(
        'test-client',
        'http://localhost:3000/callback',
        'user-123',
      );

      const result = await oauth2Service.exchangeCodeForToken({
        grantType: 'authorization_code',
        code,
        clientId: 'test-client',
        clientSecret: 'wrong-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result).toBeNull();
    });

    test('should return null for wrong redirect uri', async () => {
      const code = oauth2Service.generateAuthorizationCode(
        'test-client',
        'http://localhost:3000/callback',
        'user-123',
      );

      const result = await oauth2Service.exchangeCodeForToken({
        grantType: 'authorization_code',
        code,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://different.com/callback',
      });

      expect(result).toBeNull();
    });

    test('should not allow code reuse', async () => {
      const code = oauth2Service.generateAuthorizationCode(
        'test-client',
        'http://localhost:3000/callback',
        'user-123',
      );

      // First exchange should work
      const result1 = await oauth2Service.exchangeCodeForToken({
        grantType: 'authorization_code',
        code,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result1).not.toBeNull();

      // Second exchange should fail
      const result2 = await oauth2Service.exchangeCodeForToken({
        grantType: 'authorization_code',
        code,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result2).toBeNull();
    });
  });

  describe('refreshToken', () => {
    test('should refresh token', async () => {
      const code = oauth2Service.generateAuthorizationCode(
        'test-client',
        'http://localhost:3000/callback',
        'user-123',
      );

      const tokenResponse = await oauth2Service.exchangeCodeForToken({
        grantType: 'authorization_code',
        code,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(tokenResponse?.refreshToken).toBeDefined();

      const refreshResult = await oauth2Service.refreshToken(tokenResponse!.refreshToken!);

      expect(refreshResult).not.toBeNull();
      expect(refreshResult?.accessToken).toBeDefined();
      expect(refreshResult?.refreshToken).toBeDefined();
    });

    test('should return null for invalid refresh token', async () => {
      const result = await oauth2Service.refreshToken('invalid-token');

      expect(result).toBeNull();
    });
  });

  describe('with userProvider', () => {
    test('should use userProvider for token generation', async () => {
      const userProvider = async (userId: string): Promise<UserInfo | null> => {
        if (userId === 'user-123') {
          return {
            id: userId,
            username: 'alice',
            roles: ['admin', 'user'],
          };
        }
        return null;
      };

      const serviceWithProvider = new OAuth2Service(
        jwtUtil,
        [testClient],
        {},
        userProvider,
      );

      const code = serviceWithProvider.generateAuthorizationCode(
        'test-client',
        'http://localhost:3000/callback',
        'user-123',
      );

      const result = await serviceWithProvider.exchangeCodeForToken({
        grantType: 'authorization_code',
        code,
        clientId: 'test-client',
        clientSecret: 'test-secret',
        redirectUri: 'http://localhost:3000/callback',
      });

      expect(result).not.toBeNull();

      // Verify the token contains the user info
      const decoded = jwtUtil.verify(result!.accessToken);
      expect(decoded?.username).toBe('alice');
      expect(decoded?.roles).toContain('admin');
    });
  });
});
