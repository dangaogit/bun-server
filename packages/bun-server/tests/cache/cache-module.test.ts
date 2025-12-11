import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { MODULE_METADATA_KEY } from '../../src/di/module';
import { Container } from '../../src/di/container';
import { ModuleRegistry } from '../../src/di/module-registry';
import {
  CacheModule,
  CacheService,
  CACHE_SERVICE_TOKEN,
  MemoryCacheStore,
  type CacheModuleOptions,
} from '../../src/cache';

describe('CacheModule', () => {
  let container: Container;
  let moduleRegistry: ModuleRegistry;

  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, CacheModule);
    container = new Container();
    moduleRegistry = ModuleRegistry.getInstance();
    moduleRegistry.clear();
  });

  test('should register cache service provider', () => {
    CacheModule.forRoot();

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, CacheModule);
    expect(metadata).toBeDefined();
    expect(metadata.providers).toBeDefined();

    const cacheProvider = metadata.providers.find(
      (provider: any) => provider.provide === CACHE_SERVICE_TOKEN,
    );
    expect(cacheProvider).toBeDefined();
    expect(cacheProvider.useValue).toBeInstanceOf(CacheService);
  });

  test('should use custom store when provided', () => {
    const customStore = new MemoryCacheStore();
    CacheModule.forRoot({
      store: customStore,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, CacheModule);
    const cacheProvider = metadata.providers.find(
      (provider: any) => provider.provide === CACHE_SERVICE_TOKEN,
    );
    const service = cacheProvider.useValue as CacheService;
    expect(service).toBeInstanceOf(CacheService);
  });

  test('should use default TTL when provided', () => {
    CacheModule.forRoot({
      defaultTtl: 60000,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, CacheModule);
    const cacheProvider = metadata.providers.find(
      (provider: any) => provider.provide === CACHE_SERVICE_TOKEN,
    );
    expect(cacheProvider).toBeDefined();
  });

  test('should use key prefix when provided', () => {
    CacheModule.forRoot({
      keyPrefix: 'app:',
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, CacheModule);
    const cacheProvider = metadata.providers.find(
      (provider: any) => provider.provide === CACHE_SERVICE_TOKEN,
    );
    expect(cacheProvider).toBeDefined();
  });
});

describe('CacheService', () => {
  let service: CacheService;
  let store: MemoryCacheStore;

  beforeEach(() => {
    store = new MemoryCacheStore();
    service = new CacheService({
      store,
      defaultTtl: 3600000,
      keyPrefix: '',
    });
  });

  test('should get and set cache values', async () => {
    await service.set('key1', 'value1');
    const value = await service.get<string>('key1');
    expect(value).toBe('value1');
  });

  test('should return undefined for non-existent key', async () => {
    const value = await service.get('non-existent');
    expect(value).toBeUndefined();
  });

  test('should delete cache value', async () => {
    await service.set('key1', 'value1');
    await service.delete('key1');
    const value = await service.get('key1');
    expect(value).toBeUndefined();
  });

  test('should check if key exists', async () => {
    await service.set('key1', 'value1');
    expect(await service.has('key1')).toBe(true);
    expect(await service.has('non-existent')).toBe(false);
  });

  test('should clear all cache', async () => {
    await service.set('key1', 'value1');
    await service.set('key2', 'value2');
    await service.clear();
    expect(await service.has('key1')).toBe(false);
    expect(await service.has('key2')).toBe(false);
  });

  test('should get or set cache value', async () => {
    const value1 = await service.getOrSet('key1', () => 'computed');
    expect(value1).toBe('computed');

    const value2 = await service.getOrSet('key1', () => 'should-not-run');
    expect(value2).toBe('computed');
  });

  test('should get many cache values', async () => {
    await service.set('key1', 'value1');
    await service.set('key2', 'value2');
    const values = await service.getMany<string>(['key1', 'key2', 'key3']);
    expect(values.get('key1')).toBe('value1');
    expect(values.get('key2')).toBe('value2');
    expect(values.get('key3')).toBeUndefined();
  });

  test('should set many cache values', async () => {
    await service.setMany([
      { key: 'key1', value: 'value1' },
      { key: 'key2', value: 'value2' },
    ]);
    expect(await service.get('key1')).toBe('value1');
    expect(await service.get('key2')).toBe('value2');
  });

  test('should delete many cache values', async () => {
    await service.set('key1', 'value1');
    await service.set('key2', 'value2');
    await service.set('key3', 'value3');
    const deleted = await service.deleteMany(['key1', 'key2']);
    expect(deleted.length).toBe(2);
    expect(await service.has('key1')).toBe(false);
    expect(await service.has('key2')).toBe(false);
    expect(await service.has('key3')).toBe(true);
  });

  test('should respect TTL', async () => {
    await service.set('key1', 'value1', 100);
    expect(await service.get('key1')).toBe('value1');
    await new Promise((resolve) => setTimeout(resolve, 150));
    const value = await service.get('key1');
    expect(value).toBeUndefined();
  });

  test('should use key prefix', async () => {
    const prefixedService = new CacheService({
      store,
      defaultTtl: 3600000,
      keyPrefix: 'app:',
    });
    await prefixedService.set('key1', 'value1');
    const value = await prefixedService.get('key1');
    expect(value).toBe('value1');
  });
});

describe('MemoryCacheStore', () => {
  let store: MemoryCacheStore;

  beforeEach(() => {
    store = new MemoryCacheStore();
  });

  test('should store and retrieve values', async () => {
    await store.set('key1', 'value1');
    const value = await store.get('key1');
    expect(value).toBe('value1');
  });

  test('should expire values after TTL', async () => {
    await store.set('key1', 'value1', 100);
    expect(await store.get('key1')).toBe('value1');
    await new Promise((resolve) => setTimeout(resolve, 150));
    const value = await store.get('key1');
    expect(value).toBeUndefined();
  });

  test('should handle getMany and setMany', async () => {
    await store.setMany([
      { key: 'key1', value: 'value1' },
      { key: 'key2', value: 'value2' },
    ]);
    const values = await store.getMany(['key1', 'key2', 'key3']);
    expect(values.get('key1')).toBe('value1');
    expect(values.get('key2')).toBe('value2');
    expect(values.get('key3')).toBeUndefined();
  });
});
