import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { DebugModule, RequestRecorder } from '../../src/debug';
import { MODULE_METADATA_KEY } from '../../src/di/module';
import { getTestPort } from '../utils/test-port';

describe('RequestRecorder', () => {
  let recorder: RequestRecorder;

  beforeEach(() => {
    recorder = new RequestRecorder(10);
  });

  test('should record and retrieve requests', () => {
    recorder.record({
      timestamp: 1000,
      request: { method: 'GET', path: '/test', headers: {} },
      response: { status: 200, headers: {}, bodySize: 0 },
      timing: { total: 5 },
      metadata: {},
    });

    const all = recorder.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].request.method).toBe('GET');
    expect(all[0].request.path).toBe('/test');
    expect(all[0].id).toBeDefined();
  });

  test('should get record by id', () => {
    recorder.record({
      timestamp: 1000,
      request: { method: 'POST', path: '/api', headers: {} },
      response: { status: 201, headers: {}, bodySize: 10 },
      timing: { total: 10 },
      metadata: {},
    });

    const all = recorder.getAll();
    const id = all[0].id;
    const found = recorder.getById(id);
    expect(found).toBeDefined();
    expect(found?.request.method).toBe('POST');
  });

  test('should use ring buffer when maxRecords exceeded', () => {
    for (let i = 0; i < 15; i++) {
      recorder.record({
        timestamp: 1000 + i,
        request: { method: 'GET', path: `/test/${i}`, headers: {} },
        response: { status: 200, headers: {}, bodySize: 0 },
        timing: { total: 1 },
        metadata: {},
      });
    }

    expect(recorder.getCount()).toBe(10);
    expect(recorder.getAll()).toHaveLength(10);
  });

  test('should clear all records', () => {
    recorder.record({
      timestamp: 1000,
      request: { method: 'GET', path: '/test', headers: {} },
      response: { status: 200, headers: {}, bodySize: 0 },
      timing: { total: 1 },
      metadata: {},
    });

    recorder.clear();
    expect(recorder.getCount()).toBe(0);
    expect(recorder.getAll()).toHaveLength(0);
  });
});

describe('DebugModule', () => {
  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, DebugModule);
  });

  test('should register providers and middlewares via forRoot', () => {
    DebugModule.forRoot({ maxRecords: 100, path: '/_debug' });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, DebugModule);
    expect(metadata.providers).toBeDefined();
    expect(metadata.providers.length).toBeGreaterThanOrEqual(2);
    expect(metadata.middlewares).toBeDefined();
    expect(metadata.middlewares.length).toBe(2);
  });

  test('should not add middlewares when disabled', () => {
    DebugModule.forRoot({ enabled: false });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, DebugModule);
    expect(metadata.middlewares).toHaveLength(0);
  });
});

describe('DebugModule Integration', () => {
  let app: Application;
  let port: number;

  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, DebugModule);
    port = getTestPort();
    app = new Application();
    app.registerModule(DebugModule.forRoot({ path: '/_debug', maxRecords: 50 }));
  });

  afterEach(async () => {
    await app.stop();
  });

  test('should serve debug UI at configured path', async () => {
    await app.listen(port);
    const res = await fetch(`http://localhost:${port}/_debug`);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
    const html = await res.text();
    expect(html).toContain('Debug - Request Replay');
  });

  test('should list records via API', async () => {
    await app.listen(port);
    await fetch(`http://localhost:${port}/api/test`);
    const res = await fetch(`http://localhost:${port}/_debug/api/records`);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should clear records via API', async () => {
    await app.listen(port);
    const res = await fetch(`http://localhost:${port}/_debug/api/records`, {
      method: 'DELETE',
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});
