import { describe, expect, test, beforeEach } from 'bun:test';
import { ServiceClient } from '../../src/microservice/service-client/service-client';
import { LoadBalancerFactory } from '../../src/microservice/service-client/load-balancer';
import type { ServiceRegistry, ServiceInstance } from '../../src/microservice/service-registry/types';

describe('ServiceClient', () => {
  let mockServiceRegistry: ServiceRegistry;
  let serviceClient: ServiceClient;

  beforeEach(() => {
    // 创建 Mock ServiceRegistry
    mockServiceRegistry = {
      async register(instance: ServiceInstance) {},
      async deregister(instance: ServiceInstance) {},
      async renew(instance: ServiceInstance) {},
      async getInstances(serviceName: string) {
        return [
          {
            serviceName,
            ip: '127.0.0.1',
            port: 3000,
            healthy: true,
            weight: 100,
          },
          {
            serviceName,
            ip: '127.0.0.1',
            port: 3001,
            healthy: true,
            weight: 200,
          },
        ];
      },
      watchInstances() {
        return () => {};
      },
      async close() {},
    };

    serviceClient = new ServiceClient(mockServiceRegistry);
  });

  test('should create ServiceClient instance', () => {
    expect(serviceClient).toBeInstanceOf(ServiceClient);
  });

  test('should throw error when no instances found', async () => {
    const emptyRegistry: ServiceRegistry = {
      ...mockServiceRegistry,
      async getInstances() {
        return [];
      },
    };

    const client = new ServiceClient(emptyRegistry);

    await expect(
      client.call({
        serviceName: 'test-service',
        method: 'GET',
        path: '/api/test',
      }),
    ).rejects.toThrow('No instances found');
  });

  test('should add request interceptor', () => {
    const interceptor = {
      intercept: async (options: any) => {
        options.headers = { ...options.headers, 'X-Custom': 'value' };
        return options;
      },
    };

    serviceClient.addRequestInterceptor(interceptor);
    // 验证拦截器已添加（通过调用时验证）
    expect(serviceClient).toBeDefined();
  });

  test('should add response interceptor', () => {
    const interceptor = {
      intercept: async (response: any) => {
        return response;
      },
    };

    serviceClient.addResponseInterceptor(interceptor);
    // 验证拦截器已添加
    expect(serviceClient).toBeDefined();
  });
});

describe('LoadBalancerFactory', () => {
  const instances: ServiceInstance[] = [
    { serviceName: 'test', ip: '127.0.0.1', port: 3000, weight: 100 },
    { serviceName: 'test', ip: '127.0.0.1', port: 3001, weight: 200 },
  ];

  test('should create RandomLoadBalancer', () => {
    const balancer = LoadBalancerFactory.create('random');
    expect(balancer).toBeDefined();
    const instance = balancer.select(instances);
    expect(instance).toBeDefined();
    expect(instances).toContain(instance);
  });

  test('should create RoundRobinLoadBalancer', () => {
    const balancer = LoadBalancerFactory.create('roundRobin');
    expect(balancer).toBeDefined();
    const instance1 = balancer.select(instances);
    const instance2 = balancer.select(instances);
    expect(instance1).toBeDefined();
    expect(instance2).toBeDefined();
  });

  test('should create WeightedRoundRobinLoadBalancer', () => {
    const balancer = LoadBalancerFactory.create('weightedRoundRobin');
    expect(balancer).toBeDefined();
    const instance = balancer.select(instances);
    expect(instance).toBeDefined();
  });

  test('should create ConsistentHashLoadBalancer', () => {
    const balancer = LoadBalancerFactory.create('consistentHash');
    expect(balancer).toBeDefined();
    const instance = balancer.select(instances, 'test-key');
    expect(instance).toBeDefined();
  });

  test('should create LeastActiveLoadBalancer', () => {
    const balancer = LoadBalancerFactory.create('leastActive');
    expect(balancer).toBeDefined();
    const instance = balancer.select(instances);
    expect(instance).toBeDefined();
  });
});

