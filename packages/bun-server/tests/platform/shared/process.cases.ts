import type { TestSuite } from './suite';
import type { IProcessAdapter } from '../../../src/platform/types';

export function runProcessCases(suite: TestSuite, getAdapter: () => IProcessAdapter): void {
  const { test, expect } = suite;

  test('sleep waits at least the specified time', async () => {
    const adapter = getAdapter();
    const start = Date.now();
    await adapter.sleep(100);
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(90);
  });

  test('spawn runs a process and returns exit code 0', async () => {
    const adapter = getAdapter();
    const child = adapter.spawn({
      cmd: ['node', '--version'],
      stdout: 'pipe',
      stderr: 'ignore',
    });
    expect(child.pid).toBeGreaterThan(0);
    const exitCode = await child.exited;
    expect(exitCode).toBe(0);
  });
}
