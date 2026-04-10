import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import { resolvePlatform } from '../../src/platform/detector';

describe('resolvePlatform priority chain', () => {
  const originalArgv = process.argv.slice();
  const originalEnv = process.env['BUN_SERVER_PLATFORM'];

  afterEach(() => {
    process.argv.length = 0;
    for (const arg of originalArgv) process.argv.push(arg);
    if (originalEnv === undefined) {
      delete process.env['BUN_SERVER_PLATFORM'];
    } else {
      process.env['BUN_SERVER_PLATFORM'] = originalEnv;
    }
  });

  test('bootstrap config takes highest priority over CLI arg', () => {
    process.argv.push('--platform=node');
    expect(resolvePlatform('bun')).toBe('bun');
  });

  test('CLI arg --platform=node', () => {
    delete process.env['BUN_SERVER_PLATFORM'];
    process.argv.push('--platform=node');
    expect(resolvePlatform()).toBe('node');
  });

  test('CLI arg --platform=bun', () => {
    delete process.env['BUN_SERVER_PLATFORM'];
    process.argv.push('--platform=bun');
    expect(resolvePlatform()).toBe('bun');
  });

  test('env var BUN_SERVER_PLATFORM=node', () => {
    process.env['BUN_SERVER_PLATFORM'] = 'node';
    expect(resolvePlatform()).toBe('node');
  });

  test('env var BUN_SERVER_PLATFORM=bun', () => {
    process.env['BUN_SERVER_PLATFORM'] = 'bun';
    expect(resolvePlatform()).toBe('bun');
  });

  test('CLI arg takes priority over env var', () => {
    process.env['BUN_SERVER_PLATFORM'] = 'node';
    process.argv.push('--platform=bun');
    expect(resolvePlatform()).toBe('bun');
  });

  test('auto-detect returns bun when running in Bun', () => {
    delete process.env['BUN_SERVER_PLATFORM'];
    // We're running in Bun (bun:test), so auto-detect should return 'bun'
    const result = resolvePlatform();
    expect(result).toBe('bun');
  });
});
