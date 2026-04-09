import { describe, test, expect } from 'vitest';
import { initRuntime, getRuntime, _resetRuntime } from '../../../src/platform/runtime';
import { runProcessCases } from '../shared/process.cases';

describe('NodeProcessAdapter', () => {
  _resetRuntime();
  initRuntime('node');
  runProcessCases({ test, expect: expect as any, beforeEach: () => {} }, () => getRuntime().process);
});
