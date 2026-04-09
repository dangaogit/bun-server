import { describe, test, expect } from 'bun:test';
import { initRuntime, getRuntime } from '../../../src/platform/runtime';
import { runWebSocketCases } from '../shared/websocket.cases';

describe('BunWebSocket', () => {
  initRuntime('bun');
  runWebSocketCases({ test, expect: expect as any, beforeEach: () => {} }, () => getRuntime());
});
