import { describe, expect, test, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { getTestPort } from '../utils/test-port';

describe('Application', () => {
  let app: Application;

  afterEach(() => {
    if (app) {
      app.stop();
    }
  });

  test('should create application instance', () => {
    app = new Application();
    expect(app).toBeInstanceOf(Application);
  });

  test('should create application with options', () => {
    const port = getTestPort();
    app = new Application({ port });
    expect(app).toBeInstanceOf(Application);
  });

  test('should start server', () => {
    const port = getTestPort();
    app = new Application({ port });
    app.listen();
    
    const server = app.getServer();
    expect(server).toBeDefined();
    expect(server?.isRunning()).toBe(true);
  });

  test('should stop server', () => {
    const port = getTestPort();
    app = new Application({ port });
    app.listen();
    app.stop();
    
    const server = app.getServer();
    expect(server?.isRunning()).toBe(false);
  });

  test('should handle request with 404 by default', async () => {
    const port = getTestPort();
    app = new Application({ port });
    app.listen();
    
    const response = await fetch(`http://localhost:${port}/api/users`);
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error).toBe('Not Found');
  });
});

