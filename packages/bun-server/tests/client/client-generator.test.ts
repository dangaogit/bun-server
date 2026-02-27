import 'reflect-metadata';
import { describe, expect, test, afterEach } from 'bun:test';
import { ClientGenerator } from '../../src/client/generator';
import { createClient } from '../../src/client/runtime';
import { Application } from '../../src/core/application';
import { Controller } from '../../src/controller';
import { GET, POST } from '../../src/router/decorators';
import { Param, Body } from '../../src/controller';

@Controller('/api/users')
class UserController {
  @GET('/')
  public listUsers(): object {
    return [{ id: 1, name: 'Alice' }];
  }

  @GET('/:id')
  public getUser(@Param('id') id: string): object {
    return { id, name: 'Alice' };
  }

  @POST('/')
  public createUser(@Body() body: unknown): object {
    return { ...(body as object), id: '99' };
  }
}

@Controller('/api/posts')
class PostController {
  @GET('/')
  public listPosts(): object {
    return [{ id: 1, title: 'Hello' }];
  }
}

describe('ClientGenerator', () => {
  let app: Application | undefined;

  afterEach(async () => {
    if (app) {
      await app.stop();
      app = undefined;
    }
  });

  test('should generate route manifest from registered controllers', () => {
    app = new Application({ enableSignalHandlers: false });
    app.registerController(UserController);
    app.registerController(PostController);

    const manifest = ClientGenerator.generate();

    expect(manifest.routes.length).toBeGreaterThanOrEqual(4);

    const userList = manifest.routes.find(
      (r) => r.controllerName === 'UserController' && r.methodName === 'listUsers',
    );
    expect(userList).toBeDefined();
    expect(userList!.method).toBe('GET');
    expect(userList!.path).toMatch(/^\/api\/users\/?$/);

    const userGet = manifest.routes.find(
      (r) => r.controllerName === 'UserController' && r.methodName === 'getUser',
    );
    expect(userGet).toBeDefined();
    expect(userGet!.path).toBe('/api/users/:id');

    const userCreate = manifest.routes.find(
      (r) => r.controllerName === 'UserController' && r.methodName === 'createUser',
    );
    expect(userCreate).toBeDefined();
    expect(userCreate!.method).toBe('POST');
  });

  test('should generate valid JSON', () => {
    app = new Application({ enableSignalHandlers: false });
    app.registerController(UserController);

    const json = ClientGenerator.generateJSON();
    const parsed = JSON.parse(json);
    expect(parsed.routes).toBeArray();
  });
});

describe('createClient', () => {
  let app: Application | undefined;

  afterEach(async () => {
    if (app) {
      await app.stop();
      app = undefined;
    }
  });

  test('should create client from manifest and make requests', async () => {
    app = new Application({ enableSignalHandlers: false });
    app.registerController(UserController);
    app.registerController(PostController);
    await app.listen(0);

    const port = app.getServer()!.getPort();
    const manifest = ClientGenerator.generate();

    const client = createClient(manifest, {
      baseUrl: `http://localhost:${port}`,
    });

    expect(client.user).toBeDefined();
    expect(client.post).toBeDefined();

    const users = await client.user.listUsers();
    expect(users).toEqual([{ id: 1, name: 'Alice' }]);

    const user = await client.user.getUser({ params: { id: '42' } });
    expect(user).toEqual({ id: '42', name: 'Alice' });

    const created = await client.user.createUser({
      body: { name: 'Bob' },
    });
    expect(created).toEqual({ name: 'Bob', id: '99' });

    const posts = await client.post.listPosts();
    expect(posts).toEqual([{ id: 1, title: 'Hello' }]);
  });

  test('should support custom headers', async () => {
    app = new Application({ enableSignalHandlers: false });
    app.registerController(UserController);
    await app.listen(0);

    const port = app.getServer()!.getPort();
    const manifest = ClientGenerator.generate();

    const client = createClient(manifest, {
      baseUrl: `http://localhost:${port}`,
      headers: { 'X-Custom': 'test' },
    });

    const users = await client.user.listUsers();
    expect(users).toBeDefined();
  });
});
