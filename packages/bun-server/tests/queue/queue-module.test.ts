import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import 'reflect-metadata';

import { MODULE_METADATA_KEY } from '../../src/di/module';
import { Container } from '../../src/di/container';
import { ModuleRegistry } from '../../src/di/module-registry';
import {
  QueueModule,
  QueueService,
  QUEUE_SERVICE_TOKEN,
  MemoryQueueStore,
  type QueueModuleOptions,
  type Job,
} from '../../src/queue';

describe('QueueModule', () => {
  let container: Container;
  let moduleRegistry: ModuleRegistry;

  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, QueueModule);
    container = new Container();
    moduleRegistry = ModuleRegistry.getInstance();
    moduleRegistry.clear();
  });

  test('should register queue service provider', () => {
    QueueModule.forRoot();

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, QueueModule);
    expect(metadata).toBeDefined();
    expect(metadata.providers).toBeDefined();

    const queueProvider = metadata.providers.find(
      (provider: any) => provider.provide === QUEUE_SERVICE_TOKEN,
    );
    expect(queueProvider).toBeDefined();
    expect(queueProvider.useValue).toBeInstanceOf(QueueService);
  });

  test('should use custom store when provided', () => {
    const customStore = new MemoryQueueStore();
    QueueModule.forRoot({
      store: customStore,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, QueueModule);
    const queueProvider = metadata.providers.find(
      (provider: any) => provider.provide === QUEUE_SERVICE_TOKEN,
    );
    expect(queueProvider).toBeDefined();
  });

  test('should configure default queue name', () => {
    QueueModule.forRoot({
      defaultQueue: 'custom-queue',
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, QueueModule);
    expect(metadata).toBeDefined();
  });

  test('should configure worker settings', () => {
    QueueModule.forRoot({
      enableWorker: false,
      concurrency: 5,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, QueueModule);
    expect(metadata).toBeDefined();
  });
});

describe('QueueService', () => {
  let service: QueueService;
  let store: MemoryQueueStore;

  beforeEach(() => {
    store = new MemoryQueueStore();
    service = new QueueService({
      store,
      defaultQueue: 'default',
      enableWorker: false, // 禁用工作进程以便测试
      concurrency: 1,
    });
  });

  afterEach(() => {
    service.destroy();
  });

  test('should add job to queue', async () => {
    const jobId = await service.add('test-job', { data: 'test' });
    expect(jobId).toBeDefined();
    expect(typeof jobId).toBe('string');
  });

  test('should get job by id', async () => {
    const jobId = await service.add('test-job', { data: 'test' });
    const job = await service.get(jobId);
    expect(job).toBeDefined();
    expect(job?.name).toBe('test-job');
    expect(job?.data).toEqual({ data: 'test' });
  });

  test('should delete job', async () => {
    const jobId = await service.add('test-job', { data: 'test' });
    const deleted = await service.delete(jobId);
    expect(deleted).toBe(true);
    const job = await service.get(jobId);
    expect(job).toBeUndefined();
  });

  test('should clear queue', async () => {
    await service.add('test-job', { data: 'test' });
    await service.add('test-job2', { data: 'test2' });
    const cleared = await service.clear();
    expect(cleared).toBe(true);
    const count = await service.count();
    expect(count).toBe(0);
  });

  test('should count jobs in queue', async () => {
    await service.add('test-job', { data: 'test' });
    await service.add('test-job2', { data: 'test2' });
    const count = await service.count();
    expect(count).toBe(2);
  });

  test('should register job handler', async () => {
    let handlerCalled = false;
    await service.registerHandler('test-job', async (job) => {
      handlerCalled = true;
      expect(job.name).toBe('test-job');
    });
    expect(handlerCalled).toBe(false); // Handler not called yet
  });

  test('should add job with options', async () => {
    const jobId = await service.add(
      'test-job',
      { data: 'test' },
      {
        delay: 1000,
        priority: 10,
        attempts: 3,
      },
    );
    const job = await service.get(jobId);
    expect(job).toBeDefined();
    expect(job?.options?.delay).toBe(1000);
    expect(job?.options?.priority).toBe(10);
    expect(job?.options?.attempts).toBe(3);
  });
});

describe('MemoryQueueStore', () => {
  let store: MemoryQueueStore;

  beforeEach(() => {
    store = new MemoryQueueStore();
  });

  test('should add and get job', async () => {
    const jobId = await store.add('test-queue', {
      name: 'test-job',
      data: { test: 'data' },
    });
    expect(jobId).toBeDefined();

    const job = await store.get('test-queue', jobId);
    expect(job).toBeDefined();
    expect(job?.name).toBe('test-job');
    expect(job?.data).toEqual({ test: 'data' });
  });

  test('should get next job', async () => {
    await store.add('test-queue', {
      name: 'job1',
      data: { id: 1 },
    });
    await store.add('test-queue', {
      name: 'job2',
      data: { id: 2 },
    });

    const nextJob = await store.getNext('test-queue');
    expect(nextJob).toBeDefined();
    expect(nextJob?.name).toBe('job1');
  });

  test('should update job status', async () => {
    const jobId = await store.add('test-queue', {
      name: 'test-job',
      data: {},
    });
    const updated = await store.updateStatus('test-queue', jobId, 'active');
    expect(updated).toBe(true);

    const job = await store.get('test-queue', jobId);
    expect(job?.status).toBe('active');
  });

  test('should count jobs', async () => {
    await store.add('test-queue', { name: 'job1', data: {} });
    await store.add('test-queue', { name: 'job2', data: {} });
    const count = await store.count('test-queue');
    expect(count).toBe(2);
  });

  test('should clear queue', async () => {
    await store.add('test-queue', { name: 'job1', data: {} });
    await store.clear('test-queue');
    const count = await store.count('test-queue');
    expect(count).toBe(0);
  });
});
