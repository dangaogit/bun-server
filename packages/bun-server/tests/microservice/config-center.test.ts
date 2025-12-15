import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';
import { ConfigCenterModule, CONFIG_CENTER_TOKEN, type ConfigCenter } from '../../src/microservice/config-center';
import { Container } from '../../src/di/container';
import { ModuleRegistry } from '../../src/di/module-registry';
import { MODULE_METADATA_KEY } from '../../src/di/module';
import { ControllerRegistry } from '../../src/controller/controller';

describe('ConfigCenterModule', () => {
  beforeEach(() => {
    // 清除模块元数据
    Reflect.deleteMetadata(MODULE_METADATA_KEY, ConfigCenterModule);
    ControllerRegistry.getInstance().clear();
  });

  test('should register config center provider', () => {
    ConfigCenterModule.forRoot({
      provider: 'nacos',
      nacos: {
        client: {
          serverList: ['http://localhost:8848'],
          namespaceId: 'public',
        },
        watchInterval: 3000,
      },
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ConfigCenterModule);
    expect(metadata).toBeDefined();
    expect(metadata.providers).toBeDefined();

    const configCenterProvider = metadata.providers.find(
      (provider: any) => provider.provide === CONFIG_CENTER_TOKEN,
    );
    expect(configCenterProvider).toBeDefined();
  });

  test('should throw error when provider is not supported', () => {
    expect(() => {
      ConfigCenterModule.forRoot({
        provider: 'unsupported' as any,
      } as any);
    }).toThrow('Unsupported config center provider');
  });

  test('should throw error when nacos config is missing', () => {
    expect(() => {
      ConfigCenterModule.forRoot({
        provider: 'nacos',
      } as any);
    }).toThrow('Nacos configuration is required');
  });
});

describe('ConfigCenter Interface (Mock)', () => {
  test('should implement ConfigCenter interface', async () => {
    const mockConfigCenter: ConfigCenter = {
      async getConfig(dataId: string, groupName: string, namespaceId?: string) {
        return {
          content: JSON.stringify({ key: 'value' }),
          md5: 'abc123',
          lastModified: Date.now(),
          contentType: 'application/json',
        };
      },
      watchConfig(dataId: string, groupName: string, listener: any, namespaceId?: string) {
        return () => {}; // 返回取消监听的函数
      },
      async close() {},
    };

    const result = await mockConfigCenter.getConfig('test-config', 'DEFAULT_GROUP');
    expect(result.content).toBeDefined();
    expect(result.md5).toBeDefined();
  });
});

