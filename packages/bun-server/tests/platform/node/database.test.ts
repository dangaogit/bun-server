import { describe, test, expect } from 'vitest';
import { initRuntime, _resetRuntime } from '../../../src/platform/runtime';
import { runDatabaseCases } from '../shared/database.cases';

describe('NodeDatabase', () => {
  _resetRuntime();
  initRuntime('node');
  runDatabaseCases({ test, expect: expect as any, beforeEach: () => {} }, 'node');
});
