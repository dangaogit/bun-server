import { describe, expect, test, beforeEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { DashboardModule } from '../../src/dashboard';
import { RouteRegistry } from '../../src/router/registry';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('DashboardModule', () => {
  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, DashboardModule);
  });

  test('should register dashboard extension in forRoot', () => {
    DashboardModule.forRoot({ path: '/_dashboard' });
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, DashboardModule);
    expect(metadata).toBeDefined();
    expect(metadata.extensions).toHaveLength(1);
  });

  test('should use default path when not specified', () => {
    DashboardModule.forRoot({});
    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, DashboardModule);
    expect(metadata).toBeDefined();
    expect(metadata.extensions).toHaveLength(1);
  });

  test('should register routes when extension is used', async () => {
    const app = new Application();
    app.registerModule(DashboardModule.forRoot({ path: '/_dashboard' }));
    await app.listen(0);
    try {
      const port = app.getServer()?.getPort() ?? 0;
      const baseRes = await fetch(`http://127.0.0.1:${port}/_dashboard`);
      expect(baseRes.status).toBe(200);
      expect(baseRes.headers.get('Content-Type')).toContain('text/html');

      const systemRes = await fetch(`http://127.0.0.1:${port}/_dashboard/api/system`);
      expect(systemRes.status).toBe(200);
      const systemData = await systemRes.json();
      expect(systemData).toHaveProperty('uptime');
      expect(systemData).toHaveProperty('memory');
      expect(systemData.memory).toHaveProperty('rss');
      expect(systemData.memory).toHaveProperty('heapUsed');
      expect(systemData).toHaveProperty('platform');
      expect(systemData).toHaveProperty('bunVersion');

      const routesRes = await fetch(`http://127.0.0.1:${port}/_dashboard/api/routes`);
      expect(routesRes.status).toBe(200);
      const routesData = await routesRes.json();
      expect(Array.isArray(routesData)).toBe(true);

      const healthRes = await fetch(`http://127.0.0.1:${port}/_dashboard/api/health`);
      expect(healthRes.status).toBe(200);
      const healthData = await healthRes.json();
      expect(healthData).toHaveProperty('status');
      expect(healthData).toHaveProperty('timestamp');
    } finally {
      await app.stop();
    }
  });

  test('should require Basic Auth when configured', async () => {
    const app = new Application();
    app.registerModule(
      DashboardModule.forRoot({
        path: '/_dashboard',
        auth: { username: 'admin', password: 'secret' },
      }),
    );
    await app.listen(0);
    try {
      const port = app.getServer()?.getPort() ?? 0;
      const res = await fetch(`http://127.0.0.1:${port}/_dashboard/api/system`);
      expect(res.status).toBe(401);

      const authRes = await fetch(`http://127.0.0.1:${port}/_dashboard/api/system`, {
        headers: {
          Authorization: 'Basic ' + btoa('admin:secret'),
        },
      });
      expect(authRes.status).toBe(200);
    } finally {
      await app.stop();
    }
  });
});
