import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import 'reflect-metadata';

import { ConfigModule } from '../../src/config/config-module';
import { ConfigService } from '../../src/config/service';
import { CONFIG_SERVICE_TOKEN } from '../../src/config/types';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('ConfigModule', () => {
  beforeEach(() => {
    // Clear metadata before each test
    Reflect.deleteMetadata(MODULE_METADATA_KEY, ConfigModule);
  });

  describe('forRoot', () => {
    test('should create module with default config', () => {
      ConfigModule.forRoot({
        defaultConfig: { app: { name: 'TestApp', port: 3000 } },
      });

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
      expect(metadata.providers).toBeDefined();
      expect(metadata.providers.length).toBeGreaterThan(0);
      expect(metadata.exports).toContain(CONFIG_SERVICE_TOKEN);
    });

    test('should merge defaultConfig with loaded config', () => {
      process.env.TEST_PORT = '4000';

      ConfigModule.forRoot({
        defaultConfig: { app: { name: 'TestApp', port: 3000 } },
        load: (env) => ({
          app: { port: Number(env.TEST_PORT), name: 'LoadedApp' },
        }),
      });

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
      const serviceProvider = metadata.providers.find(
        (p: any) => p.provide === CONFIG_SERVICE_TOKEN,
      );
      const service = serviceProvider?.useValue as ConfigService;

      // Loaded config should override default (shallow merge at top level)
      expect(service.get('app.port')).toBe(4000);
      // Note: shallow merge means the entire 'app' object is replaced
      expect(service.get('app.name')).toBe('LoadedApp');

      delete process.env.TEST_PORT;
    });

    test('should support custom namespace', () => {
      ConfigModule.forRoot({
        defaultConfig: { db: { host: 'localhost' } },
        namespace: 'myapp',
      });

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
      const serviceProvider = metadata.providers.find(
        (p: any) => p.provide === CONFIG_SERVICE_TOKEN,
      );
      const service = serviceProvider?.useValue as ConfigService;

      // The service wraps config with namespace access
      expect(service.getAll()).toHaveProperty('db');
    });

    test('should call validate function', () => {
      let validated = false;
      ConfigModule.forRoot({
        defaultConfig: { test: 'value' },
        validate: (config) => {
          validated = true;
          expect(config.test).toBe('value');
        },
      });

      expect(validated).toBe(true);
    });

    test('should throw if validation fails', () => {
      expect(() => {
        ConfigModule.forRoot({
          defaultConfig: { test: 'value' },
          validate: () => {
            throw new Error('Validation failed');
          },
        });
      }).toThrow('Validation failed');
    });

    test('should store configCenter options when enabled', () => {
      ConfigModule.forRoot({
        defaultConfig: {},
        configCenter: {
          enabled: true,
          configs: new Map(),
        },
      });

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
      const serviceProvider = metadata.providers.find(
        (p: any) => p.provide === CONFIG_SERVICE_TOKEN,
      );
      const service = serviceProvider?.useValue as ConfigService;

      expect((service as any)._configCenterOptions).toBeDefined();
    });

    test('should work with empty options', () => {
      ConfigModule.forRoot();

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
      expect(metadata.providers).toBeDefined();
    });

    test('should accumulate providers on multiple calls', () => {
      Reflect.deleteMetadata(MODULE_METADATA_KEY, ConfigModule);

      ConfigModule.forRoot({ defaultConfig: { a: 1 } });
      const metadata1 = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
      const providersCount1 = metadata1.providers.length;

      ConfigModule.forRoot({ defaultConfig: { b: 2 } });
      const metadata2 = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
      const providersCount2 = metadata2.providers.length;

      expect(providersCount2).toBeGreaterThan(providersCount1);
    });
  });
});

describe('ConfigModule.setValueByPath', () => {
  // Access private method for testing
  const setValueByPath = (ConfigModule as any).setValueByPath.bind(ConfigModule);

  test('should set top-level value', () => {
    const obj: Record<string, unknown> = {};
    setValueByPath(obj, 'key', 'value');
    expect(obj.key).toBe('value');
  });

  test('should set nested value', () => {
    const obj: Record<string, unknown> = {};
    setValueByPath(obj, 'a.b.c', 'deep');
    expect((obj.a as any).b.c).toBe('deep');
  });

  test('should create intermediate objects', () => {
    const obj: Record<string, unknown> = {};
    setValueByPath(obj, 'level1.level2.level3', 123);
    expect((obj.level1 as any).level2.level3).toBe(123);
  });

  test('should overwrite existing primitive with object', () => {
    const obj: Record<string, unknown> = { a: 'string' };
    setValueByPath(obj, 'a.b', 'new');
    expect((obj.a as any).b).toBe('new');
  });

  test('should handle null values in path', () => {
    const obj: Record<string, unknown> = { a: null };
    setValueByPath(obj, 'a.b', 'value');
    expect((obj.a as any).b).toBe('value');
  });
});
