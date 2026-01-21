import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import 'reflect-metadata';

import { MODULE_METADATA_KEY } from '../../src/di/module';
import {
  ConfigModule,
  ConfigService,
  CONFIG_SERVICE_TOKEN,
  type ConfigModuleOptions,
} from '../../src/config';

describe('ConfigModule setValueByPath', () => {
  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, ConfigModule);
  });

  test('should set value at root level', () => {
    const obj: Record<string, unknown> = {};
    (ConfigModule as any).setValueByPath(obj, 'key', 'value');

    expect(obj.key).toBe('value');
  });

  test('should set value at nested path', () => {
    const obj: Record<string, unknown> = {};
    (ConfigModule as any).setValueByPath(obj, 'a.b.c', 'nested');

    expect((obj as any).a.b.c).toBe('nested');
  });

  test('should create intermediate objects', () => {
    const obj: Record<string, unknown> = {};
    (ConfigModule as any).setValueByPath(obj, 'level1.level2.level3', 'deep');

    expect(obj.level1).toBeDefined();
    expect((obj.level1 as any).level2).toBeDefined();
    expect((obj.level1 as any).level2.level3).toBe('deep');
  });

  test('should override non-object values in path', () => {
    const obj: Record<string, unknown> = { a: 'string' };
    (ConfigModule as any).setValueByPath(obj, 'a.b', 'value');

    expect((obj as any).a.b).toBe('value');
  });

  test('should handle null values in path', () => {
    const obj: Record<string, unknown> = { a: null };
    (ConfigModule as any).setValueByPath(obj, 'a.b', 'value');

    expect((obj as any).a.b).toBe('value');
  });
});

describe('ConfigModule configCenter options', () => {
  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, ConfigModule);
  });

  afterEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, ConfigModule);
  });

  test('should enable config center integration when enabled is true', () => {
    const options: ConfigModuleOptions = {
      defaultConfig: { app: { name: 'test' } },
      configCenter: {
        enabled: true,
      },
    };

    ConfigModule.forRoot(options);

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
    const configProvider = metadata.providers.find(
      (p: any) => p.provide === CONFIG_SERVICE_TOKEN,
    );
    const service = configProvider.useValue as ConfigService;

    // 检查配置中心选项被保存
    expect((service as any)._configCenterOptions).toBeDefined();
    expect((service as any)._configCenterOptions.enabled).toBe(true);
  });

  test('should not set config center options when not enabled', () => {
    const options: ConfigModuleOptions = {
      defaultConfig: { app: { name: 'test' } },
    };

    ConfigModule.forRoot(options);

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
    const configProvider = metadata.providers.find(
      (p: any) => p.provide === CONFIG_SERVICE_TOKEN,
    );
    const service = configProvider.useValue as ConfigService;

    expect((service as any)._configCenterOptions).toBeUndefined();
  });

  test('should save config center configs map', () => {
    const configs = new Map([
      ['app', { dataId: 'app-config', groupName: 'DEFAULT_GROUP' }],
    ]);

    const options: ConfigModuleOptions = {
      defaultConfig: { app: { name: 'test' } },
      configCenter: {
        enabled: true,
        configs,
      },
    };

    ConfigModule.forRoot(options);

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
    const configProvider = metadata.providers.find(
      (p: any) => p.provide === CONFIG_SERVICE_TOKEN,
    );
    const service = configProvider.useValue as ConfigService;

    expect((service as any)._configCenterOptions.configs).toBe(configs);
  });

  test('should save configCenterPriority option', () => {
    const options: ConfigModuleOptions = {
      defaultConfig: {},
      configCenter: {
        enabled: true,
        configCenterPriority: false,
      },
    };

    ConfigModule.forRoot(options);

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
    const configProvider = metadata.providers.find(
      (p: any) => p.provide === CONFIG_SERVICE_TOKEN,
    );
    const service = configProvider.useValue as ConfigService;

    expect((service as any)._configCenterOptions.configCenterPriority).toBe(false);
  });
});

describe('ConfigService extended', () => {
  test('should update config via updateConfig', () => {
    const service = new ConfigService({ initial: 'value' });

    service.updateConfig({ initial: 'updated', newKey: 'newValue' });

    expect(service.get<string>('initial')).toBe('updated');
    expect(service.get<string>('newKey')).toBe('newValue');
  });

  test('should get all config', () => {
    const config = { a: 1, b: { c: 2 } };
    const service = new ConfigService(config);

    const all = service.getAll();

    expect(all).toEqual(config);
  });

  test('should work with namespace prefix', () => {
    const service = new ConfigService({
      app: {
        name: 'test',
        settings: {
          debug: true,
        },
      },
    }, 'app');

    // 带命名空间访问
    expect(service.get<string>('name')).toBe('test');
    expect(service.get<boolean>('settings.debug')).toBe(true);

    // 完整路径访问也应该工作
    expect(service.get<string>('app.name')).toBe('test');
  });

  test('should merge config via mergeConfig', () => {
    const service = new ConfigService({ a: 1, b: 2 });

    service.mergeConfig({ b: 3, c: 4 });

    expect(service.get<number>('a')).toBe(1);
    expect(service.get<number>('b')).toBe(3);
    expect(service.get<number>('c')).toBe(4);
  });

  test('should notify listeners on config update', () => {
    const service = new ConfigService({ value: 'initial' });
    let receivedConfig: any = null;

    service.onConfigUpdate((config) => {
      receivedConfig = config;
    });

    service.updateConfig({ value: 'updated' });

    expect(receivedConfig).toEqual({ value: 'updated' });
  });

  test('should notify listeners on config merge', () => {
    const service = new ConfigService({ a: 1 });
    let receivedConfig: any = null;

    service.onConfigUpdate((config) => {
      receivedConfig = config;
    });

    service.mergeConfig({ b: 2 });

    expect(receivedConfig).toEqual({ a: 1, b: 2 });
  });

  test('should unsubscribe from config updates', () => {
    const service = new ConfigService({ value: 'initial' });
    let callCount = 0;

    const unsubscribe = service.onConfigUpdate(() => {
      callCount++;
    });

    service.updateConfig({ value: 'first' });
    expect(callCount).toBe(1);

    unsubscribe();
    service.updateConfig({ value: 'second' });
    expect(callCount).toBe(1); // 不应该增加
  });

  test('should handle listener errors gracefully', () => {
    const service = new ConfigService({ value: 'initial' });
    let errorThrown = false;

    // 添加一个会抛出错误的监听器
    service.onConfigUpdate(() => {
      throw new Error('Listener error');
    });

    // 添加一个正常的监听器
    let received = false;
    service.onConfigUpdate(() => {
      received = true;
    });

    // 捕获 console.error
    const originalError = console.error;
    console.error = () => {
      errorThrown = true;
    };

    try {
      service.updateConfig({ value: 'updated' });

      // 错误应该被捕获
      expect(errorThrown).toBe(true);
      // 第二个监听器应该仍然被调用
      expect(received).toBe(true);
    } finally {
      console.error = originalError;
    }
  });

  test('should get required value', () => {
    const service = new ConfigService({ required: 'exists' });

    expect(service.getRequired<string>('required')).toBe('exists');
  });

  test('should throw for missing required value', () => {
    const service = new ConfigService({});

    expect(() => service.getRequired('missing')).toThrow(
      'Config value required for key: missing',
    );
  });

  test('should create namespace view', () => {
    const service = new ConfigService({
      db: { host: 'localhost', port: 5432 },
    });

    const dbConfig = service.withNamespace('db');

    expect(dbConfig.get<string>('host')).toBe('localhost');
    expect(dbConfig.get<number>('port')).toBe(5432);
  });

  test('should handle empty namespace key', () => {
    const service = new ConfigService({
      ns: { a: 1 },
    }, 'ns');

    // 空键应该返回命名空间下的整个对象
    const result = service.get('');
    expect(result).toEqual({ a: 1 });
  });
});

describe('ConfigModule snapshotEnv', () => {
  test('should load config from environment via load function', () => {
    const originalEnv = process.env.TEST_VAR;
    process.env.TEST_VAR = 'test-value';

    try {
      Reflect.deleteMetadata(MODULE_METADATA_KEY, ConfigModule);

      ConfigModule.forRoot({
        defaultConfig: {},
        load: (env) => ({
          testVar: env.TEST_VAR,
        }),
      });

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
      const configProvider = metadata.providers.find(
        (p: any) => p.provide === CONFIG_SERVICE_TOKEN,
      );
      const service = configProvider.useValue as ConfigService;

      expect(service.get<string>('testVar')).toBe('test-value');
    } finally {
      if (originalEnv === undefined) {
        delete process.env.TEST_VAR;
      } else {
        process.env.TEST_VAR = originalEnv;
      }
    }
  });
});
