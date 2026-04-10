import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import type { TestSuite } from './suite';
import type { IFsAdapter } from '../../../src/platform/types';

export function runFsCases(suite: TestSuite, getAdapter: () => IFsAdapter): void {
  const { test, expect, beforeEach } = suite;

  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `platform-fs-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  test('write and read text', async () => {
    const adapter = getAdapter();
    const filePath = join(tmpDir, 'hello.txt');
    await adapter.write(filePath, 'hello world');
    const content = await adapter.file(filePath).text();
    expect(content).toBe('hello world');
  });

  test('write and read bytes', async () => {
    const adapter = getAdapter();
    const filePath = join(tmpDir, 'bytes.bin');
    const data = new Uint8Array([1, 2, 3, 4, 5]);
    await adapter.write(filePath, data);
    const result = await adapter.file(filePath).bytes();
    expect(result[0]).toBe(1);
    expect(result[4]).toBe(5);
  });

  test('file.exists() returns true for existing file', async () => {
    const adapter = getAdapter();
    const filePath = join(tmpDir, 'exists.txt');
    await adapter.write(filePath, 'content');
    const exists = await adapter.file(filePath).exists();
    expect(exists).toBe(true);
  });

  test('file.exists() returns false for missing file', async () => {
    const adapter = getAdapter();
    const filePath = join(tmpDir, 'does-not-exist.txt');
    const exists = await adapter.file(filePath).exists();
    expect(exists).toBe(false);
  });

  test('file.type returns MIME type', async () => {
    const adapter = getAdapter();
    const filePath = join(tmpDir, 'image.png');
    await adapter.write(filePath, new Uint8Array([0x89, 0x50, 0x4e, 0x47]));
    const mime = adapter.file(filePath).type;
    expect(mime).toContain('png');
  });

  test('stream() produces readable stream with correct content', async () => {
    const adapter = getAdapter();
    const filePath = join(tmpDir, 'stream.txt');
    await adapter.write(filePath, 'stream content');
    const stream = adapter.file(filePath).stream();
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }
    const combined = Buffer.concat(chunks).toString('utf-8');
    expect(combined).toBe('stream content');
  });

  test('glob finds matching files', async () => {
    const adapter = getAdapter();
    await adapter.write(join(tmpDir, 'a.json'), '{}');
    await adapter.write(join(tmpDir, 'b.json'), '{}');
    await adapter.write(join(tmpDir, 'c.txt'), 'text');
    const files = adapter.glob('*.json', tmpDir);
    expect(files.length).toBeGreaterThanOrEqual(2);
  });
}
