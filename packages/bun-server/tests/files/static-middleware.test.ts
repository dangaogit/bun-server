import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createStaticFileMiddleware } from '../../src/files/static-middleware';
import { Context } from '../../src/core/context';

describe('Static File Middleware', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'bun-static-'));
    await Bun.write(join(root, 'hello.txt'), 'hello world');
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  test('should serve static files by prefix', async () => {
    const middleware = createStaticFileMiddleware({ root, prefix: '/static' });
    const request = new Request('http://localhost/static/hello.txt');
    const context = new Context(request);

    const response = await middleware(context, async () => context.createResponse({ error: '404' }));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('hello world');
  });

  test('should fall through when file missing', async () => {
    const middleware = createStaticFileMiddleware({ root, prefix: '/static' });
    const request = new Request('http://localhost/static/missing.txt');
    const context = new Context(request);

    const response = await middleware(context, async () =>
      context.createResponse({ fallback: true }, { status: 404 }),
    );
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.fallback).toBe(true);
  });

  test('should return 404 when fallthrough disabled', async () => {
    const middleware = createStaticFileMiddleware({ root, prefix: '/files', fallthrough: false });
    const request = new Request('http://localhost/files/absent.txt');
    const context = new Context(request);

    const response = await middleware(context, async () =>
      context.createResponse({ fallback: false }, { status: 200 }),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'File Not Found' });
  });

  test('should skip non GET/HEAD methods', async () => {
    const middleware = createStaticFileMiddleware({ root, prefix: '/static' });
    const request = new Request('http://localhost/static/hello.txt', { method: 'POST' });
    const context = new Context(request);

    const response = await middleware(context, async () => context.createResponse({ passthrough: true }));
    expect(await response.json()).toEqual({ passthrough: true });
  });
});


