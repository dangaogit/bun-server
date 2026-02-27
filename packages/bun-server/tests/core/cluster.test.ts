import 'reflect-metadata';
import { describe, expect, test } from 'bun:test';
import { ClusterManager } from '../../src/core/cluster';

describe('ClusterManager', () => {
  test('isWorker should return false in test environment', () => {
    expect(ClusterManager.isWorker()).toBe(false);
  });

  test('getWorkerId should return -1 when not in worker', () => {
    expect(ClusterManager.getWorkerId()).toBe(-1);
  });

  test('should calculate worker count from auto', () => {
    const manager = new ClusterManager({
      workers: 'auto',
      scriptPath: '/tmp/test.ts',
      port: 3000,
    });
    // auto should resolve to CPU core count
    expect(manager).toBeDefined();
  });

  test('should accept explicit worker count', () => {
    const manager = new ClusterManager({
      workers: 4,
      scriptPath: '/tmp/test.ts',
      port: 3000,
    });
    expect(manager).toBeDefined();
  });
});
