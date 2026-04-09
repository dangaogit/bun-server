import { describe, test, expect } from 'vitest';
import { initRuntime, getRuntime, _resetRuntime } from '../../../src/platform/runtime';
import { runCryptoCases } from '../shared/crypto.cases';

describe('NodeCryptoAdapter', () => {
  _resetRuntime();
  initRuntime('node');
  runCryptoCases({ test, expect: expect as any, beforeEach: () => {} }, () => getRuntime().crypto);
});
