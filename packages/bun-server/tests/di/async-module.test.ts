import 'reflect-metadata';
import { describe, expect, test, beforeEach } from 'bun:test';
import { AsyncProviderRegistry, registerAsyncProviders } from '../../src/di/async-module';
import { Module, MODULE_METADATA_KEY } from '../../src/di/module';
import { Container } from '../../src/di/container';

const TEST_TOKEN_A = Symbol('test:a');
const TEST_TOKEN_B = Symbol('test:b');
const DEP_TOKEN = Symbol('test:dep');

describe('AsyncProviderRegistry', () => {
  beforeEach(() => {
    AsyncProviderRegistry.getInstance().clear();
  });

  test('should register and initialize async providers', async () => {
    const registry = AsyncProviderRegistry.getInstance();
    const container = new Container();

    registry.register(TEST_TOKEN_A, async () => {
      return { value: 'async-value' };
    });

    expect(registry.hasPending()).toBe(true);

    await registry.initializeAll(container);

    expect(registry.hasPending()).toBe(false);
    const resolved = container.resolve<{ value: string }>(TEST_TOKEN_A);
    expect(resolved.value).toBe('async-value');
  });

  test('should resolve inject dependencies from container', async () => {
    const registry = AsyncProviderRegistry.getInstance();
    const container = new Container();

    container.registerInstance(DEP_TOKEN, { url: 'postgres://localhost' });

    registry.register(TEST_TOKEN_A, async (c) => {
      const dep = c.resolve<{ url: string }>(DEP_TOKEN);
      return { connectionUrl: dep.url };
    });

    await registry.initializeAll(container);

    const resolved = container.resolve<{ connectionUrl: string }>(TEST_TOKEN_A);
    expect(resolved.connectionUrl).toBe('postgres://localhost');
  });

  test('should initialize multiple async providers in order', async () => {
    const registry = AsyncProviderRegistry.getInstance();
    const container = new Container();
    const order: string[] = [];

    registry.register(TEST_TOKEN_A, async () => {
      order.push('a');
      return 'value-a';
    });

    registry.register(TEST_TOKEN_B, async () => {
      order.push('b');
      return 'value-b';
    });

    await registry.initializeAll(container);

    expect(order).toEqual(['a', 'b']);
    expect(container.resolve(TEST_TOKEN_A)).toBe('value-a');
    expect(container.resolve(TEST_TOKEN_B)).toBe('value-b');
  });
});

describe('registerAsyncProviders', () => {
  beforeEach(() => {
    AsyncProviderRegistry.getInstance().clear();
  });

  test('should register async tokens on module metadata', () => {
    @Module({ providers: [] })
    class TestModule {}

    Reflect.deleteMetadata(MODULE_METADATA_KEY, TestModule);

    const tokenMap = new Map<symbol, (config: { name: string }) => unknown>();
    tokenMap.set(TEST_TOKEN_A, (config) => config.name);

    registerAsyncProviders(
      TestModule,
      {
        useFactory: () => ({ name: 'hello' }),
      },
      tokenMap,
    );

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, TestModule);
    expect(metadata).toBeDefined();
    expect(metadata.exports).toContain(TEST_TOKEN_A);
  });

  test('should work end-to-end with AsyncProviderRegistry', async () => {
    const registry = AsyncProviderRegistry.getInstance();
    const container = new Container();

    @Module({ providers: [] })
    class TestModule {}

    Reflect.deleteMetadata(MODULE_METADATA_KEY, TestModule);

    const tokenMap = new Map<symbol, (config: { port: number }) => unknown>();
    tokenMap.set(TEST_TOKEN_A, (config) => ({ port: config.port }));

    registerAsyncProviders(
      TestModule,
      {
        useFactory: async () => ({ port: 5432 }),
      },
      tokenMap,
    );

    await registry.initializeAll(container);

    const resolved = container.resolve<{ port: number }>(TEST_TOKEN_A);
    expect(resolved.port).toBe(5432);
  });
});
