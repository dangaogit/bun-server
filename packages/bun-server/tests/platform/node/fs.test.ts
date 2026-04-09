import { describe, test, expect, beforeEach } from 'vitest';
import { initRuntime, getRuntime, _resetRuntime } from '../../../src/platform/runtime';
import { runFsCases } from '../shared/fs.cases';

describe('NodeFsAdapter', () => {
  _resetRuntime();
  initRuntime('node');
  runFsCases({ test, expect: expect as any, beforeEach }, () => getRuntime().fs);
});
