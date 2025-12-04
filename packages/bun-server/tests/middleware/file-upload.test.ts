import { describe, expect, test } from 'bun:test';

import { Context } from '../../src/core/context';
import { createFileUploadMiddleware } from '../../src/middleware/builtin/file-upload';

function createMultipartRequest(boundary: string, body: string): Request {
  return new Request('http://localhost/upload', {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });
}

describe('FileUploadMiddleware', () => {
  test('should parse multipart form data and attach files', async () => {
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="text"\r\n\r\n` +
      `hello\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="test.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `file content\r\n` +
      `--${boundary}--`;

    const ctx = new Context(createMultipartRequest(boundary, body));
    const middleware = createFileUploadMiddleware();

    const response = await middleware(ctx, async () => ctx.createResponse({ ok: true }));
    expect(response.status).toBe(200);

    const bodyData = ctx.body as { fields: Record<string, unknown>; files: Record<string, unknown> };
    expect(bodyData.fields.text).toBe('hello');
    expect(bodyData.files.file[0].name).toBe('test.txt');
  });
});


