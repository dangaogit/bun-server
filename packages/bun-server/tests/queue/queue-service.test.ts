import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { QueueService } from '../../src/queue/service';
import type { QueueStore, Job, JobData, QueueModuleOptions } from '../../src/queue/types';
import { QUEUE_OPTIONS_TOKEN } from '../../src/queue/types';

// Mock QueueStore
function createMockStore(): QueueStore {
  const queues = new Map<string, Map<string, Job<JobData>>>();
  let idCounter = 0;

  return {
    async add<T = JobData>(queueName: string, job: { name: string; data: T; options?: any }): Promise<string> {
      if (!queues.has(queueName)) {
        queues.set(queueName, new Map());
      }
      const jobId = `job-${++idCounter}`;
      const newJob: Job<T> = {
        id: jobId,
        name: job.name,
        data: job.data,
        status: 'waiting',
        createdAt: Date.now(),
        options: job.options,
      };
      queues.get(queueName)!.set(jobId, newJob as Job<JobData>);
      return jobId;
    },

    async get<T = JobData>(queueName: string, jobId: string): Promise<Job<T> | undefined> {
      return queues.get(queueName)?.get(jobId) as Job<T> | undefined;
    },

    async delete(queueName: string, jobId: string): Promise<boolean> {
      return queues.get(queueName)?.delete(jobId) ?? false;
    },

    async clear(queueName: string): Promise<boolean> {
      queues.get(queueName)?.clear();
      return true;
    },

    async getNext<T = JobData>(queueName: string): Promise<Job<T> | undefined> {
      const queue = queues.get(queueName);
      if (!queue || queue.size === 0) return undefined;
      const first = queue.values().next().value;
      return first as Job<T> | undefined;
    },

    async complete(queueName: string, jobId: string, result?: any): Promise<boolean> {
      const job = queues.get(queueName)?.get(jobId);
      if (job) {
        job.status = 'completed';
        job.result = result;
        job.completedAt = Date.now();
        return true;
      }
      return false;
    },

    async fail(queueName: string, jobId: string, error: Error): Promise<boolean> {
      const job = queues.get(queueName)?.get(jobId);
      if (job) {
        job.status = 'failed';
        job.error = error.message;
        return true;
      }
      return false;
    },

    async getStats(queueName: string) {
      const queue = queues.get(queueName);
      if (!queue) {
        return { waiting: 0, active: 0, completed: 0, failed: 0 };
      }
      let waiting = 0, active = 0, completed = 0, failed = 0;
      for (const job of queue.values()) {
        switch (job.status) {
          case 'waiting': waiting++; break;
          case 'active': active++; break;
          case 'completed': completed++; break;
          case 'failed': failed++; break;
        }
      }
      return { waiting, active, completed, failed };
    },
  };
}

// Helper to create QueueService with mock store
function createQueueService(options?: Partial<QueueModuleOptions>): QueueService {
  const mockStore = createMockStore();
  const moduleOptions: QueueModuleOptions = {
    store: mockStore,
    enableWorker: false, // Disable worker for unit tests
    ...options,
  };

  // Create service by setting metadata on a mock class
  const service = new (QueueService as any)({
    ...moduleOptions,
    store: mockStore,
  });

  return service;
}

describe('QueueService', () => {
  let service: QueueService;

  beforeEach(() => {
    service = createQueueService();
  });

  describe('add', () => {
    test('should add job to queue', async () => {
      const jobId = await service.add('test-job', { value: 42 });
      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    test('should add job with options', async () => {
      const jobId = await service.add(
        'test-job',
        { data: 'test' },
        { priority: 10, retries: 3 },
      );
      expect(jobId).toBeDefined();
    });

    test('should add job to custom queue', async () => {
      const jobId = await service.add('test-job', {}, undefined, 'custom-queue');
      expect(jobId).toBeDefined();
    });
  });

  describe('get', () => {
    test('should get job by id', async () => {
      const jobId = await service.add('my-job', { key: 'value' });
      const job = await service.get(jobId);

      expect(job).toBeDefined();
      expect(job?.name).toBe('my-job');
      expect(job?.data).toEqual({ key: 'value' });
    });

    test('should return undefined for non-existent job', async () => {
      const job = await service.get('non-existent');
      expect(job).toBeUndefined();
    });

    test('should get job from custom queue', async () => {
      const jobId = await service.add('job', {}, undefined, 'other-queue');
      const job = await service.get(jobId, 'other-queue');
      expect(job).toBeDefined();
    });
  });

  describe('delete', () => {
    test('should delete job', async () => {
      const jobId = await service.add('deletable', {});
      const deleted = await service.delete(jobId);
      expect(deleted).toBe(true);

      const job = await service.get(jobId);
      expect(job).toBeUndefined();
    });

    test('should return false for non-existent job', async () => {
      const deleted = await service.delete('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('clear', () => {
    test('should clear queue', async () => {
      await service.add('job1', {});
      await service.add('job2', {});

      const cleared = await service.clear();
      expect(cleared).toBe(true);
    });

    test('should clear custom queue', async () => {
      await service.add('job', {}, undefined, 'test-queue');
      const cleared = await service.clear('test-queue');
      expect(cleared).toBe(true);
    });
  });
});
