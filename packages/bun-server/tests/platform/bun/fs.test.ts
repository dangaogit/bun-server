import { describe, test, expect, beforeEach } from 'bun:test';
import { initRuntime, getRuntime } from '../../../src/platform/runtime';
import { runFsCases } from '../shared/fs.cases';

describe('BunFsAdapter', () => {
  initRuntime('bun');
  runFsCases({ test, expect: expect as any, beforeEach }, () => getRuntime().fs);
});
