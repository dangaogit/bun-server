/**
 * Basic Routing - 路由基础
 * 
 * 演示如何定义不同的 HTTP 方法路由（GET、POST、PUT、DELETE）
 * 以及如何使用路径参数和查询参数。
 * 
 * 运行方式：
 *   bun run examples/00-quick-start/02-basic-routing.ts
 * 
 * 测试：
 *   curl http://localhost:3000/api/users
 *   curl http://localhost:3000/api/users/123
 *   curl -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"name":"Alice"}'
 *   curl -X PUT http://localhost:3000/api/users/123 -H "Content-Type: application/json" -d '{"name":"Bob"}'
 *   curl -X DELETE http://localhost:3000/api/users/123
 */

import { Application, Controller, GET, POST, PUT, DELETE, Param, Body, Query } from '@dangao/bun-server';

@Controller('/api/users')
class UserController {
  /**
   * GET /api/users - 获取所有用户
   * 支持查询参数：?page=1&limit=10
   */
  @GET('/')
  public getUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return {
      users: [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 10,
    };
  }

  /**
   * GET /api/users/:id - 获取单个用户
   * 路径参数：id
   */
  @GET('/:id')
  public getUser(@Param('id') id: string) {
    return {
      id,
      name: 'User ' + id,
    };
  }

  /**
   * POST /api/users - 创建用户
   * 请求体：{ "name": "Alice" }
   */
  @POST('/')
  public createUser(@Body('name') name: string) {
    return {
      id: Date.now(),
      name,
      created: true,
    };
  }

  /**
   * PUT /api/users/:id - 更新用户
   * 路径参数：id
   * 请求体：{ "name": "Bob" }
   */
  @PUT('/:id')
  public updateUser(
    @Param('id') id: string,
    @Body('name') name: string,
  ) {
    return {
      id,
      name,
      updated: true,
    };
  }

  /**
   * DELETE /api/users/:id - 删除用户
   * 路径参数：id
   */
  @DELETE('/:id')
  public deleteUser(@Param('id') id: string) {
    return {
      id,
      deleted: true,
    };
  }
}

const app = new Application({ port: 3000 });
app.registerController(UserController);
app.listen();

console.log('🚀 Server running on http://localhost:3000');
console.log('\n📝 Available endpoints:');
console.log('  GET    /api/users     - Get all users');
console.log('  GET    /api/users/:id - Get user by ID');
console.log('  POST   /api/users     - Create user');
console.log('  PUT    /api/users/:id - Update user');
console.log('  DELETE /api/users/:id - Delete user');
console.log('\n🧪 Try it with curl:');
console.log('  curl http://localhost:3000/api/users');
console.log('  curl http://localhost:3000/api/users/123');
console.log('  curl -X POST http://localhost:3000/api/users \\');
console.log('       -H "Content-Type: application/json" \\');
console.log('       -d \'{"name":"Alice"}\'');
