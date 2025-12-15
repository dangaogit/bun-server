import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';
import { ServiceRegistryModule, SERVICE_REGISTRY_TOKEN, type ServiceRegistry } from '../../src/microservice/service-registry';
import { MODULE_METADATA_KEY } from '../../src/di/module';
import { ControllerRegistry } from '../../src/controller/controller';

describe('ServiceRegistryModule', () => {
  beforeEach(() => {
    // 清除模块元数据
    Reflect.deleteMetadata(MODULE_METADATA_KEY, ServiceRegistryModule);
    ControllerRegistry.getInstance().clear();
  });

  test('should register service registry provider', () => {
    ServiceRegistryModule.forRoot({
      provider: 'nacos',
      nacos: {
        client: {
          serverList: ['http://localhost:8848'],
          namespaceId: 'public',
        },
        heartbeatInterval: 5000,
      },
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, ServiceRegistryModule);
    expect(metadata).toBeDefined();
    expect(metadata.providers).toBeDefined();

    const serviceRegistryProvider = metadata.providers.find(
      (provider: any) => provider.provide === SERVICE_REGISTRY_TOKEN,
    );
    expect(serviceRegistryProvider).toBeDefined();
  });

  test('should throw error when provider is not supported', () => {
    expect(() => {
      ServiceRegistryModule.forRoot({
        provider: 'unsupported' as any,
      } as any);
    }).toThrow('Unsupported service registry provider');
  });

  test('should throw error when nacos config is missing', () => {
    expect(() => {
      ServiceRegistryModule.forRoot({
        provider: 'nacos',
      } as any);
    }).toThrow('Nacos configuration is required');
  });
});

describe('ServiceRegistry Interface (Mock)', () => {
  test('should implement ServiceRegistry interface', async () => {
    const mockServiceRegistry: ServiceRegistry = {
      async register(instance: any) {},
      async deregister(instance: any) {},
      async renew(instance: any) {},
      async getInstances(serviceName: string, options?: any) {
        return [
          {
            serviceName,
            ip: '127.0.0.1',
            port: 3000,
            healthy: true,
          },
        ];
      },
      watchInstances(serviceName: string, listener: any, options?: any) {
        return () => {}; // 返回取消监听的函数
      },
      async close() {},
    };

    const instances = await mockServiceRegistry.getInstances('test-service');
    expect(instances).toBeDefined();
    expect(instances.length).toBeGreaterThan(0);
  });
});

