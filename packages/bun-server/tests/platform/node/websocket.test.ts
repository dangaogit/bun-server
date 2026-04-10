import { describe, test, expect } from 'vitest';
import { initRuntime, getRuntime, _resetRuntime } from '../../../src/platform/runtime';
import { runWebSocketCases } from '../shared/websocket.cases';

describe('NodeWebSocket', () => {
  _resetRuntime();
  initRuntime('node');
  runWebSocketCases({ test, expect: expect as any, beforeEach: () => {} }, () => getRuntime());
});
