import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { MODULE_METADATA_KEY } from '../../src/di/module';
import { Container } from '../../src/di/container';
import {
  ConfigModule,
  ConfigService,
  CONFIG_SERVICE_TOKEN,
  type ConfigModuleOptions,
} from '../../src/config';

describe('ConfigService', () => {
  test('should get and set values via path', () => {
    const service = new ConfigService({
      db: {
        host: 'localhost',
        port: 5432,
      },
    });

    expect(service.get<string>('db.host')).toBe('localhost');
    expect(service.get<number>('db.port')).toBe(5432);
    expect(service.get<string>('db.user', 'root')).toBe('root');
    expect(service.get<string>('db.password')).toBeUndefined();
  });

  test('should throw when required value is missing', () => {
    const service = new ConfigService({});

    expect(() => service.getRequired('missing')).toThrow(
      'Config value required for key: missing',
    );
  });

  test('should support namespace', () => {
    const service = new ConfigService({
      logger: {
        level: 'debug',
      },
    });

    const loggerConfig = service.withNamespace('logger');
    expect(loggerConfig.get<string>('level')).toBe('debug');
    expect(loggerConfig.get<string>('logger.level')).toBe('debug');
  });
});

describe('ConfigModule', () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  test('should register config service provider', () => {
    const options: ConfigModuleOptions = {
      defaultConfig: {
        appName: 'test-app',
      },
    };

    ConfigModule.forRoot(options);

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
    expect(metadata).toBeDefined();
    expect(metadata.providers).toBeDefined();

    const configProvider = metadata.providers.find(
      (provider: any) => provider.provide === CONFIG_SERVICE_TOKEN,
    );
    expect(configProvider).toBeDefined();
    expect(configProvider.useValue).toBeInstanceOf(ConfigService);
  });

  test('should merge defaultConfig and env-loaded config', () => {
    const options: ConfigModuleOptions = {
      defaultConfig: {
        appName: 'default-app',
        port: 3000,
      },
      load() {
        return {
          appName: 'env-app',
        };
      },
    };

    ConfigModule.forRoot(options);
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule);
    const providers = metadata.providers.filter(
      (p: any) => p.provide === CONFIG_SERVICE_TOKEN,
    );
    const service = providers[providers.length - 1].useValue as ConfigService;

    expect(service.get<string>('appName')).toBe('env-app');
    expect(service.get<number>('port')).toBe(3000);
  });

  test('should validate config', () => {
    const options: ConfigModuleOptions = {
      defaultConfig: {
        appName: 'test-app',
      },
      validate(config) {
        if (!config.appName) {
          throw new Error('appName is required');
        }
      },
    };

    expect(() => ConfigModule.forRoot(options)).not.toThrow();
  });

  test('should throw when validation fails', () => {
    const options: ConfigModuleOptions = {
      defaultConfig: {},
      validate(config) {
        if (!config.appName) {
          throw new Error('appName is required');
        }
      },
    };

    expect(() => ConfigModule.forRoot(options)).toThrow(
      'appName is required',
    );
  });

  test('should export config service to parent container', () => {
    const options: ConfigModuleOptions = {
      defaultConfig: {
        appName: 'test-app',
      },
    };

    ConfigModule.forRoot(options);

    const rootContainer = new Container();
    const { ModuleRegistry } = require('../../src/di/module-registry') as typeof import('../../src/di/module-registry');
    const registry = ModuleRegistry.getInstance();
    registry.clear();
    registry.register(ConfigModule, rootContainer);

    const configService = rootContainer.resolve<ConfigService>(CONFIG_SERVICE_TOKEN);
    expect(configService).toBeInstanceOf(ConfigService);
    expect(configService.get<string>('appName')).toBe('test-app');
  });
});


