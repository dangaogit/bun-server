import 'reflect-metadata';
import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { Controller, ControllerRegistry } from '../../src/controller/controller';
import { Injectable, Inject } from '../../src/di/decorators';
import { GET, POST } from '../../src/router/decorators';
import { Body, Param, Query } from '../../src/controller/decorators';
import { RouteRegistry } from '../../src/router/registry';
import { getTestPort } from '../utils/test-port';

describe('Controller Integration', () => {
  let app: Application;
  let port: number;

  beforeEach(() => {
    port = getTestPort();
    app = new Application({ port });
  });

  afterEach(() => {
    if (app) {
      app.stop();
    }
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
  });

  test('should register and handle controller with GET route', async () => {
    @Controller('/api/users')
    class UserController {
      @GET('/')
      public getUsers() {
        return { users: ['user1', 'user2'] };
      }
    }

    app.registerController(UserController);
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.users).toEqual(['user1', 'user2']);
  });

  test('should handle controller with path parameter', async () => {
    @Controller('/api/users')
    class UserController {
      @GET('/:id')
      public getUser(@Param('id') id: string) {
        return { id, name: `User ${id}` };
      }
    }

    app.registerController(UserController);
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users/123`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe('123');
    expect(data.name).toBe('User 123');
  });

  test('should handle controller with query parameter', async () => {
    @Controller('/api/users')
    class UserController {
      @GET('/search')
      public searchUsers(@Query('q') query: string | null) {
        return { query, results: [`result for ${query}`] };
      }
    }

    app.registerController(UserController);
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users/search?q=test`);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.query).toBe('test');
  });

  test('should handle controller with POST and body', async () => {
    @Controller('/api/users')
    class UserController {
      @POST('/')
      public createUser(@Body() user: { name: string; email: string }) {
        return { id: '1', ...user };
      }
    }

    app.registerController(UserController);
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John', email: 'john@example.com' }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe('1');
    expect(data.name).toBe('John');
    expect(data.email).toBe('john@example.com');
  });

  test('should handle controller with dependency injection', async () => {
    @Injectable()
    class UserService {
      public findUser(id: string) {
        return { id, name: 'John Doe' };
      }
    }

    // 注册服务到容器（在控制器定义之前）
    const container = app.getContainer();
    container.register(UserService);

    @Controller('/api/users-di')
    class UserController {
      public constructor(@Inject(UserService) private userService: UserService) {}

      @GET('/:id')
      public getUser(@Param('id') id: string) {
        return this.userService.findUser(id);
      }
    }

    app.registerController(UserController);
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users-di/123`);
    if (response.status !== 200) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
    }
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.id).toBe('123');
    expect(data.name).toBe('John Doe');
  });

  test('should handle multiple routes in same controller', async () => {
    @Controller('/api/users')
    class UserController {
      @GET('/')
      public getUsers() {
        return { users: ['user1', 'user2'] };
      }

      @GET('/:id')
      public getUser(@Param('id') id: string) {
        return { id, name: `User ${id}` };
      }

      @POST('/')
      public createUser(@Body() user: { name: string }) {
        return { id: '1', ...user };
      }
    }

    app.registerController(UserController);
    app.listen();

    // 测试 GET /
    const listResponse = await fetch(`http://localhost:${port}/api/users`);
    expect(listResponse.status).toBe(200);
    const listData = await listResponse.json();
    expect(listData.users).toEqual(['user1', 'user2']);

    // 测试 GET /:id
    const getResponse = await fetch(`http://localhost:${port}/api/users/123`);
    expect(getResponse.status).toBe(200);
    const getData = await getResponse.json();
    expect(getData.id).toBe('123');

    // 测试 POST /
    const postResponse = await fetch(`http://localhost:${port}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New User' }),
    });
    expect(postResponse.status).toBe(200);
    const postData = await postResponse.json();
    expect(postData.name).toBe('New User');
  });
});

