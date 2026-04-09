import { describe, test, expect } from 'vitest';
import { initRuntime, getRuntime, _resetRuntime } from '../../../src/platform/runtime';
import { runParserCases } from '../shared/parser.cases';

describe('NodeParserAdapter', () => {
  _resetRuntime();
  initRuntime('node');
  runParserCases({ test, expect: expect as any, beforeEach: () => {} }, () => getRuntime().parser);
});
