import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { createFileUploadMiddleware } from '../../src/files/upload-middleware';
import { Context } from '../../src/core/context';

describe('File Upload Middleware', () => {
  let dest: string;

  beforeEach(async () => {
    dest = await mkdtemp(join(tmpdir(), 'bun-upload-'));
  });

  afterEach(async () => {
    await rm(dest, { recursive: true, force: true });
  });

  test('should store uploaded files and populate context.files', async () => {
    const middleware = createFileUploadMiddleware({ dest });
    const form = new FormData();
    form.append('avatar', new File([new Blob(['hello'])], 'avatar.txt', { type: 'text/plain' }));

    const request = new Request('http://localhost/upload', {
      method: 'POST',
      body: form,
    });
    const context = new Context(request);

    await middleware(context, async () => context.createResponse({ ok: true }));

    expect(context.files.length).toBe(1);
    const [file] = context.files;
    expect(file.fieldName).toBe('avatar');
    expect(file.mimeType).toBe('text/plain;charset=utf-8');
    const saved = Bun.file(join(dest, file.filename));
    expect(await saved.exists()).toBe(true);
    expect(await saved.text()).toBe('hello');
  });
});


