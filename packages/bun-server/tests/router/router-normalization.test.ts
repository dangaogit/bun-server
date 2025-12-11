import { describe, expect, test } from 'bun:test';
import { Router } from '../../src/router/router';
import { Context } from '../../src/core/context';

/**
 * 测试路由路径规范化行为
 * 确保带尾部斜杠的路径能正确匹配
 */
describe('Router Path Normalization', () => {
  test('findRoute should normalize path with trailing slash', () => {
    const router = new Router();
    const handler = (ctx: Context) => ctx.createResponse({ ok: true });
    
    // 注册路由（无尾部斜杠）
    router.get('/api/users', handler);

    // 使用带尾部斜杠的路径查找应该能匹配
    const route1 = router.findRoute('GET', '/api/users/');
    expect(route1).toBeDefined();
    expect(route1?.path).toBe('/api/users');

    // 使用无尾部斜杠的路径查找应该能匹配
    const route2 = router.findRoute('GET', '/api/users');
    expect(route2).toBeDefined();
    expect(route2?.path).toBe('/api/users');

    // 两者应该返回相同的路由
    expect(route1).toBe(route2);
  });

  test('findRoute should normalize root path correctly', () => {
    const router = new Router();
    const handler = (ctx: Context) => ctx.createResponse({ ok: true });
    
    // 注册根路径
    router.get('/', handler);

    // 根路径应该始终匹配（无论是否有尾部斜杠）
    const route1 = router.findRoute('GET', '/');
    expect(route1).toBeDefined();
    expect(route1?.path).toBe('/');
  });

  test('findRoute should use cache for normalized paths', () => {
    const router = new Router();
    const handler = (ctx: Context) => ctx.createResponse({ ok: true });
    
    router.get('/api/test', handler);

    // 第一次查找（带尾部斜杠）
    const route1 = router.findRoute('GET', '/api/test/');
    expect(route1).toBeDefined();

    // 第二次查找（无尾部斜杠）- 应该使用缓存
    const route2 = router.findRoute('GET', '/api/test');
    expect(route2).toBeDefined();
    expect(route2).toBe(route1);
  });

  test('findRouteWithMatch should normalize path before caching', () => {
    const router = new Router();
    const handler = (ctx: Context) => ctx.createResponse({ ok: true });
    
    router.get('/api/users', handler);

    // 使用带尾部斜杠的路径
    const result1 = router.findRouteWithMatch('GET', '/api/users/');
    expect(result1).toBeDefined();
    expect(result1?.route.path).toBe('/api/users');

    // 使用无尾部斜杠的路径 - 应该从缓存获取
    const result2 = router.findRouteWithMatch('GET', '/api/users');
    expect(result2).toBeDefined();
    expect(result2?.route.path).toBe('/api/users');
    
    // 两者应该返回相同的结果（缓存命中）
    expect(result1).toBe(result2);
  });

  test('findRoute should handle dynamic routes with trailing slash', async () => {
    const router = new Router();
    const handler = (ctx: Context) => ctx.createResponse({ id: ctx.getParam('id') });
    
    router.get('/api/users/:id', handler);

    // 使用带尾部斜杠的路径查找应该能匹配
    const route1 = router.findRoute('GET', '/api/users/123/');
    expect(route1).toBeDefined();

    // 使用无尾部斜杠的路径查找应该能匹配
    const route2 = router.findRoute('GET', '/api/users/123');
    expect(route2).toBeDefined();

    // 两者应该返回相同的路由
    expect(route1).toBe(route2);

    // 验证参数提取
    const context = new Context(new Request('http://localhost:3000/api/users/123/'));
    const response = await router.handle(context);
    expect(response).toBeDefined();
    if (response) {
      const data = await response.json();
      expect(data.id).toBe('123');
    }
  });
});
