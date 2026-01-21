import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import {
  Queue,
  Cron,
  getQueueMetadata,
  getCronMetadata,
  type QueueOptions,
  type CronDecoratorOptions,
} from '../../src/queue/decorators';

describe('Queue Decorator', () => {
  test('should set queue metadata with default options', () => {
    class TestService {
      @Queue()
      public processTask(): void {}
    }

    const metadata = getQueueMetadata(TestService.prototype.processTask);
    expect(metadata).toBeDefined();
    expect(metadata?.name).toBeUndefined();
  });

  test('should set queue metadata with custom name', () => {
    class TestService {
      @Queue({ name: 'email-queue' })
      public sendEmail(): void {}
    }

    const metadata = getQueueMetadata(TestService.prototype.sendEmail);
    expect(metadata?.name).toBe('email-queue');
  });
});

describe('Cron Decorator', () => {
  test('should set cron metadata with required pattern', () => {
    class TestService {
      @Cron({ pattern: '0 * * * *' })
      public hourlyTask(): void {}
    }

    const metadata = getCronMetadata(TestService.prototype.hourlyTask);
    expect(metadata).toBeDefined();
    expect(metadata?.pattern).toBe('0 * * * *');
    expect(metadata?.runOnInit).toBe(false);
  });

  test('should set cron metadata with timezone', () => {
    class TestService {
      @Cron({ pattern: '0 9 * * *', timezone: 'Asia/Shanghai' })
      public dailyTask(): void {}
    }

    const metadata = getCronMetadata(TestService.prototype.dailyTask);
    expect(metadata?.timezone).toBe('Asia/Shanghai');
  });

  test('should set cron metadata with runOnInit', () => {
    class TestService {
      @Cron({ pattern: '*/5 * * * *', runOnInit: true })
      public frequentTask(): void {}
    }

    const metadata = getCronMetadata(TestService.prototype.frequentTask);
    expect(metadata?.runOnInit).toBe(true);
  });

  test('should set cron metadata with queueName', () => {
    class TestService {
      @Cron({ pattern: '0 0 * * *', queueName: 'nightly-queue' })
      public nightlyTask(): void {}
    }

    const metadata = getCronMetadata(TestService.prototype.nightlyTask);
    expect(metadata?.queueName).toBe('nightly-queue');
  });

  test('should set all cron options together', () => {
    const options: CronDecoratorOptions = {
      pattern: '0 0 * * 0',
      timezone: 'UTC',
      runOnInit: true,
      queueName: 'weekly-queue',
    };

    class TestService {
      @Cron(options)
      public weeklyTask(): void {}
    }

    const metadata = getCronMetadata(TestService.prototype.weeklyTask);
    expect(metadata?.pattern).toBe('0 0 * * 0');
    expect(metadata?.timezone).toBe('UTC');
    expect(metadata?.runOnInit).toBe(true);
    expect(metadata?.queueName).toBe('weekly-queue');
  });
});

describe('Metadata getters', () => {
  test('getQueueMetadata should return undefined for non-decorated method', () => {
    class TestService {
      public normalMethod(): void {}
    }

    const metadata = getQueueMetadata(TestService.prototype.normalMethod);
    expect(metadata).toBeUndefined();
  });

  test('getCronMetadata should return undefined for non-decorated method', () => {
    class TestService {
      public normalMethod(): void {}
    }

    const metadata = getCronMetadata(TestService.prototype.normalMethod);
    expect(metadata).toBeUndefined();
  });

  test('should handle multiple decorated methods independently', () => {
    class TestService {
      @Queue({ name: 'queue1' })
      public task1(): void {}

      @Queue({ name: 'queue2' })
      public task2(): void {}

      @Cron({ pattern: '* * * * *' })
      public cronTask(): void {}
    }

    const queue1Meta = getQueueMetadata(TestService.prototype.task1);
    const queue2Meta = getQueueMetadata(TestService.prototype.task2);
    const cronMeta = getCronMetadata(TestService.prototype.cronTask);

    expect(queue1Meta?.name).toBe('queue1');
    expect(queue2Meta?.name).toBe('queue2');
    expect(cronMeta?.pattern).toBe('* * * * *');
  });
});
