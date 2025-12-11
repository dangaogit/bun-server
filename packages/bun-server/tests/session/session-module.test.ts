import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { MODULE_METADATA_KEY } from '../../src/di/module';
import { Container } from '../../src/di/container';
import { ModuleRegistry } from '../../src/di/module-registry';
import {
  SessionModule,
  SessionService,
  SESSION_SERVICE_TOKEN,
  MemorySessionStore,
  type SessionModuleOptions,
} from '../../src/session';

describe('SessionModule', () => {
  let container: Container;
  let moduleRegistry: ModuleRegistry;

  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, SessionModule);
    container = new Container();
    moduleRegistry = ModuleRegistry.getInstance();
    moduleRegistry.clear();
  });

  test('should register session service provider', () => {
    SessionModule.forRoot();

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SessionModule);
    expect(metadata).toBeDefined();
    expect(metadata.providers).toBeDefined();

    const sessionProvider = metadata.providers.find(
      (provider: any) => provider.provide === SESSION_SERVICE_TOKEN,
    );
    expect(sessionProvider).toBeDefined();
    expect(sessionProvider.useValue).toBeInstanceOf(SessionService);
  });

  test('should use custom store when provided', () => {
    const customStore = new MemorySessionStore();
    SessionModule.forRoot({
      store: customStore,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SessionModule);
    const sessionProvider = metadata.providers.find(
      (provider: any) => provider.provide === SESSION_SERVICE_TOKEN,
    );
    expect(sessionProvider).toBeDefined();
  });

  test('should configure session options', () => {
    SessionModule.forRoot({
      name: 'custom-session',
      maxAge: 7200000,
      rolling: false,
      cookie: {
        secure: true,
        httpOnly: true,
        path: '/api',
      },
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, SessionModule);
    expect(metadata).toBeDefined();
  });
});

describe('SessionService', () => {
  let service: SessionService;
  let store: MemorySessionStore;

  beforeEach(() => {
    store = new MemorySessionStore();
    service = new SessionService({
      store,
      name: 'sessionId',
      maxAge: 86400000,
      rolling: true,
      cookie: {
        secure: false,
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
      },
    });
  });

  test('should create new session', async () => {
    const session = await service.create({ userId: '123' });
    expect(session).toBeDefined();
    expect(session.id).toBeDefined();
    expect(session.data.userId).toBe('123');
    expect(session.createdAt).toBeGreaterThan(0);
    expect(session.lastAccessedAt).toBeGreaterThan(0);
    expect(session.expiresAt).toBeGreaterThan(Date.now());
  });

  test('should get session by id', async () => {
    const session = await service.create({ userId: '123' });
    const retrieved = await service.get(session.id);
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe(session.id);
    expect(retrieved?.data.userId).toBe('123');
  });

  test('should return undefined for non-existent session', async () => {
    const session = await service.get('non-existent-id');
    expect(session).toBeUndefined();
  });

  test('should update session data', async () => {
    const session = await service.create({ userId: '123' });
    const updated = await service.set(session.id, { userId: '456', role: 'admin' });
    expect(updated).toBe(true);

    const retrieved = await service.get(session.id);
    expect(retrieved?.data.userId).toBe('456');
    expect(retrieved?.data.role).toBe('admin');
  });

  test('should get session value', async () => {
    const session = await service.create({ userId: '123', role: 'admin' });
    const userId = await service.getValue<string>(session.id, 'userId');
    expect(userId).toBe('123');
  });

  test('should set session value', async () => {
    const session = await service.create({ userId: '123' });
    const set = await service.setValue(session.id, 'role', 'admin');
    expect(set).toBe(true);

    const role = await service.getValue<string>(session.id, 'role');
    expect(role).toBe('admin');
  });

  test('should delete session value', async () => {
    const session = await service.create({ userId: '123', role: 'admin' });
    const deleted = await service.deleteValue(session.id, 'role');
    expect(deleted).toBe(true);

    const role = await service.getValue(session.id, 'role');
    expect(role).toBeUndefined();
    const userId = await service.getValue(session.id, 'userId');
    expect(userId).toBe('123');
  });

  test('should delete session', async () => {
    const session = await service.create({ userId: '123' });
    const deleted = await service.delete(session.id);
    expect(deleted).toBe(true);

    const retrieved = await service.get(session.id);
    expect(retrieved).toBeUndefined();
  });

  test('should touch session to update lastAccessedAt', async () => {
    const session = await service.create({ userId: '123' });
    const originalTime = session.lastAccessedAt;
    await new Promise((resolve) => setTimeout(resolve, 10));
    const touched = await service.touch(session.id);
    expect(touched).toBe(true);

    const retrieved = await service.get(session.id);
    expect(retrieved?.lastAccessedAt).toBeGreaterThan(originalTime);
  });

  test('should get cookie name and options', () => {
    const cookieName = service.getCookieName();
    expect(cookieName).toBe('sessionId');

    const cookieOptions = service.getCookieOptions();
    expect(cookieOptions).toBeDefined();
    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.path).toBe('/');
  });

  test('should respect maxAge', async () => {
    const shortLivedService = new SessionService({
      store,
      name: 'sessionId',
      maxAge: 100,
      rolling: false,
      cookie: {},
    });

    const session = await shortLivedService.create({ userId: '123' });
    expect(session.expiresAt).toBeLessThanOrEqual(Date.now() + 100);

    await new Promise((resolve) => setTimeout(resolve, 150));
    const retrieved = await shortLivedService.get(session.id);
    expect(retrieved).toBeUndefined();
  });
});

describe('MemorySessionStore', () => {
  let store: MemorySessionStore;

  beforeEach(() => {
    store = new MemorySessionStore();
  });

  test('should store and retrieve session', async () => {
    const session = {
      id: 'session-1',
      data: { userId: '123' },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };

    await store.set(session, 86400000);
    const retrieved = await store.get('session-1');
    expect(retrieved).toBeDefined();
    expect(retrieved?.id).toBe('session-1');
    expect(retrieved?.data.userId).toBe('123');
  });

  test('should expire sessions after maxAge', async () => {
    const session = {
      id: 'session-1',
      data: { userId: '123' },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + 100,
    };

    await store.set(session, 100);
    expect(await store.get('session-1')).toBeDefined();

    await new Promise((resolve) => setTimeout(resolve, 150));
    const retrieved = await store.get('session-1');
    expect(retrieved).toBeUndefined();
  });

  test('should check if session exists', async () => {
    const session = {
      id: 'session-1',
      data: { userId: '123' },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };

    await store.set(session, 86400000);
    expect(await store.has('session-1')).toBe(true);
    expect(await store.has('non-existent')).toBe(false);
  });

  test('should touch session', async () => {
    const session = {
      id: 'session-1',
      data: { userId: '123' },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };

    await store.set(session, 86400000);
    const originalTime = session.lastAccessedAt;
    await new Promise((resolve) => setTimeout(resolve, 10));
    const touched = await store.touch('session-1');
    expect(touched).toBe(true);

    const retrieved = await store.get('session-1');
    expect(retrieved?.lastAccessedAt).toBeGreaterThan(originalTime);
  });

  test('should delete session', async () => {
    const session = {
      id: 'session-1',
      data: { userId: '123' },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };

    await store.set(session, 86400000);
    const deleted = await store.delete('session-1');
    expect(deleted).toBe(true);
    expect(await store.has('session-1')).toBe(false);
  });

  test('should clear all sessions', async () => {
    const session1 = {
      id: 'session-1',
      data: { userId: '123' },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };
    const session2 = {
      id: 'session-2',
      data: { userId: '456' },
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
      expiresAt: Date.now() + 86400000,
    };

    await store.set(session1, 86400000);
    await store.set(session2, 86400000);
    await store.clear();
    expect(await store.has('session-1')).toBe(false);
    expect(await store.has('session-2')).toBe(false);
  });
});
