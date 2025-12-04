import { describe, expect, test, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { RouteRegistry } from '../../src/router/registry';
import { Context } from '../../src/core/context';
import { ControllerRegistry } from '../../src/controller/controller';
import { getTestPort } from '../utils/test-port';

describe('Application with Router', () => {
  let app: Application;

  afterEach(() => {
    if (app) {
      app.stop();
    }
    RouteRegistry.getInstance().clear();
    ControllerRegistry.getInstance().clear();
  });

  test('should handle registered route', async () => {
    const port = getTestPort();
    app = new Application({ port });
    const registry = RouteRegistry.getInstance();
    registry.get('/api/users', (ctx: Context) => {
      return ctx.createResponse({ message: 'Hello' });
    });
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    // @ts-ignore
    expect(data.message).toBe('Hello');
  });

  test('should handle route with path parameter', async () => {
    const port = getTestPort();
    app = new Application({ port });
    const registry = RouteRegistry.getInstance();
    registry.get('/api/users/:id', (ctx: Context) => {
      return ctx.createResponse({ id: ctx.getParam('id') });
    });
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users/123`);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    // @ts-ignore
    expect(data.id).toBe('123');
  });

  test('should return 404 for non-existent route', async () => {
    const port = getTestPort();
    app = new Application({ port });
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/unknown`);
    expect(response.status).toBe(404);
    
    const data = await response.json();
    // @ts-ignore
    expect(data.error).toBe('Not Found');
  });

  test('should handle POST request', async () => {
    const port = getTestPort();
    app = new Application({ port });
    const registry = RouteRegistry.getInstance();
    registry.post('/api/users', (ctx: Context) => {
      return ctx.createResponse({ message: 'Created' });
    });
    app.listen();

    const response = await fetch(`http://localhost:${port}/api/users`, {
      method: 'POST',
    });
    expect(response.status).toBe(200);
    
    const data = await response.json();
    // @ts-ignore
    expect(data.message).toBe('Created');
  });
});

