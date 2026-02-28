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

  test('getClusterMode should return null when not in worker', () => {
    expect(ClusterManager.getClusterMode()).toBeNull();
  });

  test('should calculate worker count from auto', () => {
    const manager = new ClusterManager({
      workers: 'auto',
      scriptPath: '/tmp/test.ts',
      port: 3000,
    });
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

  describe('mode detection', () => {
    test('should default to reusePort on all platforms', () => {
      const manager = new ClusterManager({
        workers: 2,
        scriptPath: '/tmp/test.ts',
        port: 3000,
      });
      expect(manager.getMode()).toBe('reusePort');
    });

    test('should respect explicit reusePort mode', () => {
      const manager = new ClusterManager({
        workers: 2,
        scriptPath: '/tmp/test.ts',
        port: 3000,
        mode: 'reusePort',
      });
      expect(manager.getMode()).toBe('reusePort');
    });

    test('should respect explicit proxy mode', () => {
      const manager = new ClusterManager({
        workers: 2,
        scriptPath: '/tmp/test.ts',
        port: 3000,
        mode: 'proxy',
      });
      expect(manager.getMode()).toBe('proxy');
    });

    test('auto mode should resolve to reusePort', () => {
      const manager = new ClusterManager({
        workers: 2,
        scriptPath: '/tmp/test.ts',
        port: 3000,
        mode: 'auto',
      });
      expect(manager.getMode()).toBe('reusePort');
    });
  });
});
