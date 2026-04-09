import { describe, test, expect } from 'bun:test';
import { initRuntime, getRuntime } from '../../../src/platform/runtime';
import { runProcessCases } from '../shared/process.cases';

describe('BunProcessAdapter', () => {
  initRuntime('bun');
  runProcessCases({ test, expect: expect as any, beforeEach: () => {} }, () => getRuntime().process);
});
