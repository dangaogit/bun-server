/**
 * 基础路由使用示例
 */
import { Application } from '@dangao/bun-server';
import { RouteRegistry } from '@dangao/bun-server';
import type { Context } from '@dangao/bun-server';

// 获取路由注册表
const registry = RouteRegistry.getInstance();

// 注册路由
registry.get('/api/users', (ctx: Context) => {
  return ctx.createResponse({ message: 'Get all users' });
});

registry.get('/api/users/:id', (ctx: Context) => {
  const id = ctx.getParam('id');
  return ctx.createResponse({ message: `Get user ${id}` });
});

registry.post('/api/users', (ctx: Context) => {
  return ctx.createResponse({ message: 'Create user' }, { status: 201 });
});

registry.put('/api/users/:id', (ctx: Context) => {
  const id = ctx.getParam('id');
  return ctx.createResponse({ message: `Update user ${id}` });
});

registry.delete('/api/users/:id', (ctx: Context) => {
  const id = ctx.getParam('id');
  return ctx.createResponse({ message: `Delete user ${id}` });
});

// 启动应用
const app = new Application({ port: 3000 });
app.listen();

console.log('Server running at http://localhost:3000');
console.log('Try:');
console.log('  GET    http://localhost:3000/api/users');
console.log('  GET    http://localhost:3000/api/users/123');
console.log('  POST   http://localhost:3000/api/users');
console.log('  PUT    http://localhost:3000/api/users/123');
console.log('  DELETE http://localhost:3000/api/users/123');

