import { describe, expect, test, beforeEach } from 'bun:test';
import { RouteRegistry } from '../../src/router/registry';
import { Context } from '../../src/core/context';

describe('RouteRegistry', () => {
  beforeEach(() => {
    // 重置单例（在实际使用中，单例会保持状态）
    // 这里我们只是测试基本功能
  });

  test('should get singleton instance', () => {
    const instance1 = RouteRegistry.getInstance();
    const instance2 = RouteRegistry.getInstance();

    expect(instance1).toBe(instance2);
  });

  test('should register route', () => {
    const registry = RouteRegistry.getInstance();
    const handler = (ctx: Context) => ctx.createResponse({});
    
    registry.register('GET', '/api/users', handler);

    const router = registry.getRouter();
    const route = router.findRoute('GET', '/api/users');
    expect(route).toBeDefined();
  });

  test('should register GET route', () => {
    const registry = RouteRegistry.getInstance();
    const handler = (ctx: Context) => ctx.createResponse({});
    
    registry.get('/api/users', handler);

    const router = registry.getRouter();
    const route = router.findRoute('GET', '/api/users');
    expect(route).toBeDefined();
  });

  test('should register POST route', () => {
    const registry = RouteRegistry.getInstance();
    const handler = (ctx: Context) => ctx.createResponse({});
    
    registry.post('/api/users', handler);

    const router = registry.getRouter();
    const route = router.findRoute('POST', '/api/users');
    expect(route).toBeDefined();
  });
});

