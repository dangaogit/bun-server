import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ResponseBuilder } from '../../src/request/response';

describe('ResponseBuilder', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'response-builder-'));
  });

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  test('should create JSON response', async () => {
    const response = ResponseBuilder.json({ message: 'Hello' });
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('application/json');

    const data = await response.json();
    expect(data.message).toBe('Hello');
  });

  test('should create JSON response with custom status', async () => {
    const response = ResponseBuilder.json({ error: 'Not Found' }, 404);
    expect(response.status).toBe(404);
  });

  test('should create text response', async () => {
    const response = ResponseBuilder.text('Hello World');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/plain');

    const text = await response.text();
    expect(text).toBe('Hello World');
  });

  test('should create HTML response', async () => {
    const response = ResponseBuilder.html('<h1>Hello</h1>');
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html');

    const html = await response.text();
    expect(html).toBe('<h1>Hello</h1>');
  });

  test('should create empty response', () => {
    const response = ResponseBuilder.empty(204);
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
  });

  test('should create redirect response', () => {
    const response = ResponseBuilder.redirect('http://example.com');
    expect(response.status).toBe(302);
    expect(response.headers.get('Location')).toBe('http://example.com');
  });

  test('should create error response', async () => {
    const response = ResponseBuilder.error('Internal Server Error', 500);
    expect(response.status).toBe(500);

    const data = await response.json();
    expect(data.error).toBe('Internal Server Error');
  });

  test('should create file response from path', async () => {
    const filePath = join(tmpDir, 'hello.txt');
    await Bun.write(filePath, 'file-content');

    const response = ResponseBuilder.file(filePath, {
      fileName: 'download.txt',
      contentType: 'text/plain',
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Disposition')).toBe('attachment; filename="download.txt"');
    expect(response.headers.get('Content-Type')).toBe('text/plain');
    expect(await response.text()).toBe('file-content');
  });

  test('should create file response from binary source', async () => {
    const buffer = new TextEncoder().encode('binary-content');
    const response = ResponseBuilder.file(buffer, {
      status: 206,
      headers: { ETag: '123' },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get('ETag')).toBe('123');
    expect(await response.text()).toBe('binary-content');
  });
});

