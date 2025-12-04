import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import { mkdir, rm } from 'fs/promises';
import { join } from 'path';

import { createStaticFileMiddleware } from '../../src/middleware/builtin/static-file';
import { Context } from '../../src/core/context';

const TMP_DIR = join(process.cwd(), 'tmp-static-test');

async function writeFile(path: string, content: string): Promise<void> {
  await Bun.write(path, content);
}

describe('StaticFileMiddleware', () => {
  beforeAll(async () => {
    await mkdir(TMP_DIR, { recursive: true });
    await writeFile(join(TMP_DIR, 'hello.txt'), 'hello world');
    await mkdir(join(TMP_DIR, 'nested'), { recursive: true });
    await writeFile(join(TMP_DIR, 'nested', 'index.html'), '<h1>Nested</h1>');
  });

  afterAll(async () => {
    await rm(TMP_DIR, { recursive: true, force: true });
  });

  test('should serve static files under prefix', async () => {
    const middleware = createStaticFileMiddleware({
      root: TMP_DIR,
      prefix: '/static',
      enableCache: false,
    });
    const ctx = new Context(new Request('http://localhost/static/hello.txt'));
    const response = await middleware(ctx, async () => ctx.createResponse({ ok: false }));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('hello world');
  });

  test('should serve index file for directory', async () => {
    const middleware = createStaticFileMiddleware({
      root: TMP_DIR,
      prefix: '/static',
      enableCache: false,
    });
    const ctx = new Context(new Request('http://localhost/static/nested/'));
    const response = await middleware(ctx, async () => ctx.createResponse({ ok: false }));
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('Nested');
  });

  test('should block path traversal', async () => {
    const middleware = createStaticFileMiddleware({
      root: TMP_DIR,
      prefix: '/static',
    });
    const ctx = new Context(new Request('http://localhost/static/secret.txt'));
    ctx.path = '/static/../secret.txt';
    const response = await middleware(ctx, async () => ctx.createResponse({ ok: true }));
    expect(response.status).toBe(403);
  });
});


