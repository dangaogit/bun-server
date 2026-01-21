/**
 * 基础路由使用示例
 * 
 * 演示如何使用底层 RouteRegistry 直接注册路由（无装饰器方式）
 * 
 * 注意：必须在创建 Application 之后注册路由，
 * 因为 Application 构造函数会清空 RouteRegistry
 */
import {
  Application,
  CONFIG_SERVICE_TOKEN,
  ConfigModule,
  ConfigService,
  RouteRegistry,
} from '@dangao/bun-server';
import type { Context } from '@dangao/bun-server';

// 启动应用
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      port: 3000,
    },
  },
});

// 先创建 Application
const app = new Application();
app.registerModule(ConfigModule);

const config = app
  .getContainer()
  .resolve<ConfigService>(CONFIG_SERVICE_TOKEN);
const port = config.get<number>('app.port', 3000) ?? 3000;

// 在创建 Application 之后获取路由注册表
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

// 启动服务器
app.listen(port);

console.log(`🚀 Server running at http://localhost:${port}`);
console.log(`\n📝 Available endpoints:`);
console.log(`  GET    /api/users     - Get all users`);
console.log(`  GET    /api/users/:id - Get user by ID`);
console.log(`  POST   /api/users     - Create user`);
console.log(`  PUT    /api/users/:id - Update user`);
console.log(`  DELETE /api/users/:id - Delete user`);
console.log(`\n🧪 Try it with curl:`);
console.log(`  # Get all users`);
console.log(`  curl http://localhost:${port}/api/users`);
console.log(``);
console.log(`  # Get user by ID`);
console.log(`  curl http://localhost:${port}/api/users/123`);
console.log(``);
console.log(`  # Create user`);
console.log(`  curl -X POST http://localhost:${port}/api/users \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"message":"Create user"}'`);
console.log(``);
console.log(`  # Update user`);
console.log(`  curl -X PUT http://localhost:${port}/api/users/123 \\`);
console.log(`       -H "Content-Type: application/json" \\`);
console.log(`       -d '{"message":"Update user"}'`);
console.log(``);
console.log(`  # Delete user`);
console.log(`  curl -X DELETE http://localhost:${port}/api/users/123`);

