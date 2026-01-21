import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  createSecurityFilter,
  getGuardRegistry,
  registerReflector,
} from '../../src/security/filter';
import { AuthenticationManager } from '../../src/security/authentication-manager';
import { JwtAuthenticationProvider } from '../../src/security/providers/jwt-provider';
import { JWTUtil } from '../../src/auth/jwt';
import { Context } from '../../src/core/context';
import { Container } from '../../src/di/container';
import { GuardRegistry } from '../../src/security/guards/guard-registry';
import { Reflector, REFLECTOR_TOKEN } from '../../src/security/guards/reflector';
import { GUARD_REGISTRY_TOKEN } from '../../src/security/guards/types';
import { Auth } from '../../src/auth/decorators';

describe('createSecurityFilter', () => {
  let container: Container;
  let jwtUtil: JWTUtil;
  let authManager: AuthenticationManager;

  beforeEach(() => {
    container = new Container();
    jwtUtil = new JWTUtil({
      secret: 'test-secret-key-for-security-filter',
      accessTokenExpiresIn: 3600,
    });
    authManager = new AuthenticationManager();
    authManager.registerProvider(new JwtAuthenticationProvider(jwtUtil));
  });

  test('should allow request to excluded path', async () => {
    const filter = createSecurityFilter({
      authenticationManager: authManager,
      excludePaths: ['/public', '/health'],
    });

    const request = new Request('http://localhost/public/data');
    const context = new Context(request, container);

    let passed = false;
    await filter(context, async () => {
      passed = true;
      return new Response('OK');
    });

    expect(passed).toBe(true);
  });

  test('should authenticate valid token', async () => {
    const filter = createSecurityFilter({
      authenticationManager: authManager,
      defaultAuthRequired: false,
    });

    const token = jwtUtil.generateAccessToken({
      sub: 'user-123',
      username: 'alice',
    });

    const request = new Request('http://localhost/api/data', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const context = new Context(request, container);

    let passed = false;
    await filter(context, async () => {
      passed = true;
      // Check auth was set on context
      expect((context as any).auth).toBeDefined();
      expect((context as any).auth.isAuthenticated).toBe(true);
      return new Response('OK');
    });

    expect(passed).toBe(true);
  });

  test('should reject when auth required but no token', async () => {
    const filter = createSecurityFilter({
      authenticationManager: authManager,
      defaultAuthRequired: true,
      excludePaths: [],
    });

    const request = new Request('http://localhost/api/data');
    const context = new Context(request, container);

    await expect(
      filter(context, async () => new Response('OK')),
    ).rejects.toThrow();
  });

  test('should use custom token extractor', async () => {
    let extractorCalled = false;
    const filter = createSecurityFilter({
      authenticationManager: authManager,
      defaultAuthRequired: false,
      extractToken: (ctx) => {
        extractorCalled = true;
        return ctx.getHeader('X-Custom-Token');
      },
    });

    const token = jwtUtil.generateAccessToken({ sub: 'user-1' });
    const request = new Request('http://localhost/api/data', {
      headers: { 'X-Custom-Token': token },
    });
    const context = new Context(request, container);

    await filter(context, async () => new Response('OK'));

    expect(extractorCalled).toBe(true);
    expect((context as any).auth.isAuthenticated).toBe(true);
  });

  test('should handle invalid bearer token format', async () => {
    const filter = createSecurityFilter({
      authenticationManager: authManager,
      defaultAuthRequired: false,
    });

    const request = new Request('http://localhost/api/data', {
      headers: { Authorization: 'InvalidFormat' },
    });
    const context = new Context(request, container);

    let passed = false;
    await filter(context, async () => {
      passed = true;
      return new Response('OK');
    });

    expect(passed).toBe(true);
    expect((context as any).auth.isAuthenticated).toBe(false);
  });
});

describe('getGuardRegistry', () => {
  test('should return existing registry if registered', () => {
    const container = new Container();
    const existingRegistry = new GuardRegistry();
    container.registerInstance(GUARD_REGISTRY_TOKEN, existingRegistry);

    const registry = getGuardRegistry(container);
    expect(registry).toBe(existingRegistry);
  });

  test('should create and register new registry if not exists', () => {
    const container = new Container();

    const registry = getGuardRegistry(container);
    expect(registry).toBeInstanceOf(GuardRegistry);

    // Should be registered now
    const secondCall = getGuardRegistry(container);
    expect(secondCall).toBe(registry);
  });
});

describe('registerReflector', () => {
  test('should return existing reflector if registered', () => {
    const container = new Container();
    const existingReflector = new Reflector();
    container.registerInstance(REFLECTOR_TOKEN, existingReflector);

    const reflector = registerReflector(container);
    expect(reflector).toBe(existingReflector);
  });

  test('should create and register new reflector if not exists', () => {
    const container = new Container();

    const reflector = registerReflector(container);
    expect(reflector).toBeInstanceOf(Reflector);

    // Should be registered now
    const secondCall = registerReflector(container);
    expect(secondCall).toBe(reflector);
  });
});
