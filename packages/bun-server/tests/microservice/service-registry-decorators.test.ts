import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  ServiceRegistry,
  getServiceRegistryMetadata,
  type ServiceRegistryMetadata,
} from '../../src/microservice/service-registry/decorators';

describe('ServiceRegistry Decorator', () => {
  test('should set metadata with service name only', () => {
    @ServiceRegistry('my-service')
    class TestController {}

    const metadata = getServiceRegistryMetadata(TestController);
    expect(metadata).toBeDefined();
    expect(metadata?.serviceName).toBe('my-service');
    expect(metadata?.healthy).toBe(true);
  });

  test('should set metadata with custom ip and port', () => {
    @ServiceRegistry('my-service', { ip: '192.168.1.100', port: 8080 })
    class TestController {}

    const metadata = getServiceRegistryMetadata(TestController);
    expect(metadata?.ip).toBe('192.168.1.100');
    expect(metadata?.port).toBe(8080);
  });

  test('should set metadata with weight', () => {
    @ServiceRegistry('my-service', { weight: 10 })
    class TestController {}

    const metadata = getServiceRegistryMetadata(TestController);
    expect(metadata?.weight).toBe(10);
  });

  test('should set metadata with enabled flag', () => {
    @ServiceRegistry('my-service', { enabled: false })
    class TestController {}

    const metadata = getServiceRegistryMetadata(TestController);
    expect(metadata?.enabled).toBe(false);
  });

  test('should set metadata with custom metadata', () => {
    @ServiceRegistry('my-service', {
      metadata: { version: '1.0.0', region: 'us-east' },
    })
    class TestController {}

    const metadata = getServiceRegistryMetadata(TestController);
    expect(metadata?.metadata).toEqual({ version: '1.0.0', region: 'us-east' });
  });

  test('should set metadata with cluster name', () => {
    @ServiceRegistry('my-service', { clusterName: 'production' })
    class TestController {}

    const metadata = getServiceRegistryMetadata(TestController);
    expect(metadata?.clusterName).toBe('production');
  });

  test('should set metadata with namespace id', () => {
    @ServiceRegistry('my-service', { namespaceId: 'dev-namespace' })
    class TestController {}

    const metadata = getServiceRegistryMetadata(TestController);
    expect(metadata?.namespaceId).toBe('dev-namespace');
  });

  test('should set metadata with group name', () => {
    @ServiceRegistry('my-service', { groupName: 'DEFAULT_GROUP' })
    class TestController {}

    const metadata = getServiceRegistryMetadata(TestController);
    expect(metadata?.groupName).toBe('DEFAULT_GROUP');
  });

  test('should set metadata with healthy flag', () => {
    @ServiceRegistry('my-service', { healthy: false })
    class TestController {}

    const metadata = getServiceRegistryMetadata(TestController);
    expect(metadata?.healthy).toBe(false);
  });

  test('should set all options together', () => {
    @ServiceRegistry('full-service', {
      ip: '10.0.0.1',
      port: 9000,
      weight: 5,
      enabled: true,
      metadata: { env: 'production' },
      clusterName: 'cluster-a',
      namespaceId: 'ns-prod',
      groupName: 'app-group',
      healthy: true,
    })
    class TestController {}

    const metadata = getServiceRegistryMetadata(TestController);
    expect(metadata?.serviceName).toBe('full-service');
    expect(metadata?.ip).toBe('10.0.0.1');
    expect(metadata?.port).toBe(9000);
    expect(metadata?.weight).toBe(5);
    expect(metadata?.enabled).toBe(true);
    expect(metadata?.metadata).toEqual({ env: 'production' });
    expect(metadata?.clusterName).toBe('cluster-a');
    expect(metadata?.namespaceId).toBe('ns-prod');
    expect(metadata?.groupName).toBe('app-group');
    expect(metadata?.healthy).toBe(true);
  });
});

describe('getServiceRegistryMetadata', () => {
  test('should return undefined for non-decorated class', () => {
    class PlainClass {}

    const metadata = getServiceRegistryMetadata(PlainClass);
    expect(metadata).toBeUndefined();
  });

  test('should return metadata for decorated class', () => {
    @ServiceRegistry('test-service')
    class DecoratedClass {}

    const metadata = getServiceRegistryMetadata(DecoratedClass);
    expect(metadata).toBeDefined();
    expect(metadata?.serviceName).toBe('test-service');
  });

  test('should keep separate metadata for different classes', () => {
    @ServiceRegistry('service-a')
    class ServiceA {}

    @ServiceRegistry('service-b', { port: 3001 })
    class ServiceB {}

    const metadataA = getServiceRegistryMetadata(ServiceA);
    const metadataB = getServiceRegistryMetadata(ServiceB);

    expect(metadataA?.serviceName).toBe('service-a');
    expect(metadataB?.serviceName).toBe('service-b');
    expect(metadataB?.port).toBe(3001);
  });
});
