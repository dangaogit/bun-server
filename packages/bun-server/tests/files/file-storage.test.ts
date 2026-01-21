import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import { rmdir, unlink, readdir, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

import { FileStorage } from '../../src/files/storage';

describe('FileStorage', () => {
  const testDir = '/tmp/bun-server-test-uploads';

  beforeEach(async () => {
    // Clean up before each test to ensure isolation
    try {
      const files = await readdir(testDir);
      for (const file of files) {
        await unlink(join(testDir, file));
      }
      await rmdir(testDir);
    } catch {
      // Directory may not exist yet
    }
    await mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    try {
      // Clean up test directory
      const files = await readdir(testDir);
      for (const file of files) {
        await unlink(join(testDir, file));
      }
      await rmdir(testDir);
    } catch {
      // Ignore cleanup errors
    }
  });

  describe('saveFile', () => {
    test('should save file to destination', async () => {
      const uniqueName = `test-${Date.now()}-${Math.random().toString(36).slice(2)}.txt`;
      const file = new File(['test content'], uniqueName, { type: 'text/plain' });

      const result = await FileStorage.saveFile(
        file,
        { dest: testDir },
        'testField',
      );

      expect(result.fieldName).toBe('testField');
      expect(result.filename).toBe(uniqueName);
      expect(result.originalName).toBe(uniqueName);
      expect(result.mimeType).toContain('text/plain');
      expect(result.size).toBe(12);
      expect(result.path).toContain(testDir);
    });

    test('should use custom filename', async () => {
      const file = new File(['content'], 'original.txt');

      const result = await FileStorage.saveFile(
        file,
        { dest: testDir, filename: 'custom.txt' },
        'myField',
      );

      expect(result.filename).toBe('custom.txt');
    });

    test('should sanitize filename', async () => {
      const file = new File(['content'], 'file with spaces & chars!.txt');

      const result = await FileStorage.saveFile(
        file,
        { dest: testDir },
        'field',
      );

      // Should not contain spaces or special chars
      expect(result.filename).not.toContain(' ');
      expect(result.filename).not.toContain('&');
      expect(result.filename).not.toContain('!');
    });

    test('should handle file without extension', async () => {
      // File without extension still gets default mime type from Bun
      const file = new File(['data'], 'noext');

      const result = await FileStorage.saveFile(
        file,
        { dest: testDir },
        'field',
      );

      // mimeType should be defined
      expect(result.mimeType).toBeDefined();
    });

    test('should prevent overwrite by default', async () => {
      const file1 = new File(['content1'], 'same.txt');
      const file2 = new File(['content2'], 'same.txt');

      await FileStorage.saveFile(file1, { dest: testDir }, 'field1');
      const result2 = await FileStorage.saveFile(file2, { dest: testDir }, 'field2');

      // Second file should have a different name
      expect(result2.filename).not.toBe('same.txt');
      expect(result2.filename).toContain('same');
    });

    test('should allow overwrite when specified', async () => {
      const file1 = new File(['content1'], 'overwrite.txt');
      const file2 = new File(['content2'], 'overwrite.txt');

      await FileStorage.saveFile(file1, { dest: testDir }, 'field1');
      const result2 = await FileStorage.saveFile(
        file2,
        { dest: testDir, overwrite: true },
        'field2',
      );

      expect(result2.filename).toBe('overwrite.txt');
    });

    test('should create destination directory if not exists', async () => {
      const newDir = join(testDir, 'subdir', 'nested');
      const file = new File(['content'], 'test.txt');

      const result = await FileStorage.saveFile(
        file,
        { dest: newDir },
        'field',
      );

      expect(result.path).toContain(newDir);
    });
  });
});
