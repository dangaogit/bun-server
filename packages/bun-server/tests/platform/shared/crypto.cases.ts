import type { TestSuite } from './suite';
import type { ICryptoAdapter } from '../../../src/platform/types';

export function runCryptoCases(suite: TestSuite, getAdapter: () => ICryptoAdapter): void {
  const { test, expect } = suite;

  test('sha256 hex digest', () => {
    const adapter = getAdapter();
    const hasher = adapter.createHasher('sha256');
    hasher.update('hello');
    const hex = hasher.digest('hex');
    // Known sha256('hello')
    expect(hex).toBe('2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
  });

  test('sha256 base64 digest', () => {
    const adapter = getAdapter();
    const hasher = adapter.createHasher('sha256');
    hasher.update('hello');
    const b64 = hasher.digest('base64');
    expect(typeof b64).toBe('string');
    expect(b64.length).toBeGreaterThan(0);
  });

  test('sha256 arrayBuffer digest', () => {
    const adapter = getAdapter();
    const hasher = adapter.createHasher('sha256');
    hasher.update('hello');
    const buf = hasher.digest();
    // Both Bun and Node return Buffer (extends Uint8Array), not a plain ArrayBuffer
    expect(buf instanceof Uint8Array).toBe(true);
    expect(buf.byteLength).toBe(32);
  });

  test('chaining update calls', () => {
    const adapter = getAdapter();
    // sha256('helloworld') should equal updating with 'hello' then 'world' only if same bytes
    // We simply test that the result is consistent
    const h1 = adapter.createHasher('sha256');
    h1.update('hello').update('world');
    const hex1 = h1.digest('hex');

    const h2 = adapter.createHasher('sha256');
    h2.update('helloworld');
    const hex2 = h2.digest('hex');

    expect(hex1).toBe(hex2);
  });
}
