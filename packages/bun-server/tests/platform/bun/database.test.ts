import { describe, test, expect } from 'bun:test';
import { initRuntime } from '../../../src/platform/runtime';
import { runDatabaseCases } from '../shared/database.cases';

describe('BunDatabase', () => {
  initRuntime('bun');
  runDatabaseCases({ test, expect: expect as any, beforeEach: () => {} }, 'bun');
});
