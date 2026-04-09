import { describe, test, expect } from 'bun:test';
import { initRuntime, getRuntime } from '../../../src/platform/runtime';
import { runCryptoCases } from '../shared/crypto.cases';

describe('BunCryptoAdapter', () => {
  initRuntime('bun');
  runCryptoCases({ test, expect: expect as any, beforeEach: () => {} }, () => getRuntime().crypto);
});
