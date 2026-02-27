import { describe, expect, test, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { getTestPort } from '../utils/test-port';

describe('Application', () => {
  let app: Application;

  afterEach(async () => {
    if (app) {
      await app.stop();
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

  test('should start server', async () => {
    const port = getTestPort();
    app = new Application({ port });
    await app.listen();
    
    const server = app.getServer();
    expect(server).toBeDefined();
    expect(server?.isRunning()).toBe(true);
  });

  test('should stop server', async () => {
    const port = getTestPort();
    app = new Application({ port });
    await app.listen();
    await app.stop();
    
    const server = app.getServer();
    expect(server?.isRunning()).toBe(false);
  });

  test('should handle request with 404 by default', async () => {
    const port = getTestPort();
    app = new Application({ port });
    await app.listen();
    
    const response = await fetch(`http://localhost:${port}/api/users`);
    expect(response.status).toBe(404);
    
    const data = await response.json();
    expect(data.error).toBe('Not Found');
  });

  test('should accept reusePort option', async () => {
    const port = getTestPort();
    app = new Application({ port, reusePort: true });
    await app.listen();

    const server = app.getServer();
    expect(server).toBeDefined();
    expect(server?.isRunning()).toBe(true);

    const response = await fetch(`http://localhost:${port}/api/ping`);
    expect(response.status).toBe(404);
  });

  test('should allow two servers on same port with reusePort (Linux only)', async () => {
    if (process.platform !== 'linux') {
      console.log('Skipping reusePort dual-bind test: only works on Linux');
      return;
    }

    const port = getTestPort();
    app = new Application({ port, reusePort: true });
    await app.listen();

    const app2 = new Application({ port, reusePort: true });
    await app2.listen();

    try {
      const response = await fetch(`http://localhost:${port}/api/test`);
      expect(response.status).toBe(404);
    } finally {
      await app2.stop();
    }
  });
});

