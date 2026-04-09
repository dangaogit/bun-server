import { describe, test, expect } from 'bun:test';
import { initRuntime, getRuntime } from '../../../src/platform/runtime';
import { runParserCases } from '../shared/parser.cases';

describe('BunParserAdapter', () => {
  initRuntime('bun');
  runParserCases({ test, expect: expect as any, beforeEach: () => {} }, () => getRuntime().parser);
});
