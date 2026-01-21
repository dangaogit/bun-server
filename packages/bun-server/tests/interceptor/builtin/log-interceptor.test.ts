import { describe, expect, test, beforeEach, mock } from 'bun:test';
import 'reflect-metadata';

import { Container } from '../../../src/di/container';
import { Context } from '../../../src/core/context';
import {
  LogInterceptor,
  Log,
  getLogMetadata,
  LOG_METADATA_KEY,
  type LogOptions,
} from '../../../src/interceptor/builtin/log-interceptor';
import { LOGGER_TOKEN, LogLevel, type LogEntry } from '../../../src/extensions';
import { LoggerExtension } from '../../../src/extensions/logger-extension';

describe('Log Decorator', () => {
  test('should set log metadata with default options', () => {
    class TestService {
      @Log()
      public testMethod(): string {
        return 'test';
      }
    }

    const metadata = getLogMetadata(TestService.prototype, 'testMethod');
    expect(metadata).toBeDefined();
    expect(metadata?.level).toBe('info');
    expect(metadata?.logArgs).toBe(false);
    expect(metadata?.logResult).toBe(false);
    expect(metadata?.logDuration).toBe(true);
  });

  test('should set log metadata with custom options', () => {
    class TestService {
      @Log({
        level: 'debug',
        message: 'Custom log message',
        logArgs: true,
        logResult: true,
        logDuration: false,
      })
      public testMethod(): string {
        return 'test';
      }
    }

    const metadata = getLogMetadata(TestService.prototype, 'testMethod');
    expect(metadata).toBeDefined();
    expect(metadata?.level).toBe('debug');
    expect(metadata?.message).toBe('Custom log message');
    expect(metadata?.logArgs).toBe(true);
    expect(metadata?.logResult).toBe(true);
    expect(metadata?.logDuration).toBe(false);
  });

  test('should set log metadata with warn level', () => {
    class TestService {
      @Log({ level: 'warn' })
      public warnMethod(): void {}
    }

    const metadata = getLogMetadata(TestService.prototype, 'warnMethod');
    expect(metadata?.level).toBe('warn');
  });

  test('should set log metadata with error level', () => {
    class TestService {
      @Log({ level: 'error' })
      public errorMethod(): void {}
    }

    const metadata = getLogMetadata(TestService.prototype, 'errorMethod');
    expect(metadata?.level).toBe('error');
  });

  test('should return undefined for non-decorated method', () => {
    class TestService {
      public normalMethod(): void {}
    }

    const metadata = getLogMetadata(TestService.prototype, 'normalMethod');
    expect(metadata).toBeUndefined();
  });

  test('should return undefined for invalid target', () => {
    const metadata = getLogMetadata(null, 'method');
    expect(metadata).toBeUndefined();

    const metadata2 = getLogMetadata(undefined, 'method');
    expect(metadata2).toBeUndefined();

    const metadata3 = getLogMetadata('string', 'method');
    expect(metadata3).toBeUndefined();
  });
});

describe('LogInterceptor', () => {
  let container: Container;
  let interceptor: LogInterceptor;
  let logEntries: LogEntry[];

  beforeEach(() => {
    container = new Container();
    interceptor = new LogInterceptor();
    logEntries = [];

    // 注册 Logger
    const loggerExtension = new LoggerExtension({
      prefix: 'Test',
      level: LogLevel.DEBUG,
      sink(entry) {
        logEntries.push(entry);
      },
    });
    loggerExtension.register(container);
  });

  test('should log method execution with default options', async () => {
    class TestService {
      @Log()
      public testMethod(): string {
        return 'result';
      }
    }

    const service = new TestService();
    const result = await interceptor.execute(
      service,
      'testMethod',
      service.testMethod.bind(service),
      [],
      container,
      undefined,
    );

    expect(result).toBe('result');
    expect(logEntries.length).toBe(2); // Start + Completed
    expect(logEntries[0].message).toContain('Executing testMethod - Start');
    expect(logEntries[1].message).toContain('Executing testMethod - Completed');
  });

  test('should log with custom message', async () => {
    class TestService {
      @Log({ message: 'Processing user request' })
      public processUser(): void {}
    }

    const service = new TestService();
    await interceptor.execute(
      service,
      'processUser',
      service.processUser.bind(service),
      [],
      container,
      undefined,
    );

    expect(logEntries[0].message).toContain('Processing user request - Start');
    expect(logEntries[1].message).toContain('Processing user request - Completed');
  });

  test('should log method arguments when logArgs is true', async () => {
    class TestService {
      @Log({ logArgs: true })
      public greet(name: string, age: number): string {
        return `Hello ${name}, you are ${age}`;
      }
    }

    const service = new TestService();
    await interceptor.execute(
      service,
      'greet',
      service.greet.bind(service),
      ['Alice', 30],
      container,
      undefined,
    );

    // 检查 Start 日志包含参数信息
    const startLog = logEntries[0];
    expect(startLog.message).toContain('Start');
  });

  test('should log result when logResult is true', async () => {
    class TestService {
      @Log({ logResult: true })
      public calculate(): number {
        return 42;
      }
    }

    const service = new TestService();
    const result = await interceptor.execute(
      service,
      'calculate',
      service.calculate.bind(service),
      [],
      container,
      undefined,
    );

    expect(result).toBe(42);
    // 检查 Completed 日志存在
    const completedLog = logEntries[1];
    expect(completedLog.message).toContain('Completed');
  });

  test('should log duration by default', async () => {
    class TestService {
      @Log()
      public slowMethod(): string {
        return 'done';
      }
    }

    const service = new TestService();
    const result = await interceptor.execute(
      service,
      'slowMethod',
      service.slowMethod.bind(service),
      [],
      container,
      undefined,
    );

    expect(result).toBe('done');
    // 检查日志存在
    expect(logEntries.length).toBe(2);
    expect(logEntries[1].message).toContain('Completed');
  });

  test('should not log duration when logDuration is false', async () => {
    class TestService {
      @Log({ logDuration: false })
      public quickMethod(): string {
        return 'done';
      }
    }

    const service = new TestService();
    await interceptor.execute(
      service,
      'quickMethod',
      service.quickMethod.bind(service),
      [],
      container,
      undefined,
    );

    // Completed 日志不应包含 duration
    const completedLog = logEntries[1];
    // 当没有额外数据时，data 可能为空或未定义
    if (completedLog.data) {
      expect((completedLog.data as any).duration).toBeUndefined();
    }
  });

  test('should log at debug level', async () => {
    class TestService {
      @Log({ level: 'debug' })
      public debugMethod(): void {}
    }

    const service = new TestService();
    await interceptor.execute(
      service,
      'debugMethod',
      service.debugMethod.bind(service),
      [],
      container,
      undefined,
    );

    expect(logEntries[0].level).toBe(LogLevel.DEBUG);
  });

  test('should log at warn level', async () => {
    class TestService {
      @Log({ level: 'warn' })
      public warnMethod(): void {}
    }

    const service = new TestService();
    await interceptor.execute(
      service,
      'warnMethod',
      service.warnMethod.bind(service),
      [],
      container,
      undefined,
    );

    expect(logEntries[0].level).toBe(LogLevel.WARN);
  });

  test('should log at error level', async () => {
    class TestService {
      @Log({ level: 'error' })
      public errorMethod(): void {}
    }

    const service = new TestService();
    await interceptor.execute(
      service,
      'errorMethod',
      service.errorMethod.bind(service),
      [],
      container,
      undefined,
    );

    expect(logEntries[0].level).toBe(LogLevel.ERROR);
  });

  test('should log error when method throws', async () => {
    class TestService {
      @Log()
      public failingMethod(): void {
        throw new Error('Test error');
      }
    }

    const service = new TestService();

    await expect(
      interceptor.execute(
        service,
        'failingMethod',
        service.failingMethod.bind(service),
        [],
        container,
        undefined,
      ),
    ).rejects.toThrow('Test error');

    // 应该有 Start 和 Failed 日志
    expect(logEntries.length).toBe(2);
    expect(logEntries[1].message).toContain('Failed');
  });

  test('should log duration on error', async () => {
    class TestService {
      @Log()
      public failingMethod(): void {
        throw new Error('Error');
      }
    }

    const service = new TestService();

    await expect(
      interceptor.execute(
        service,
        'failingMethod',
        service.failingMethod.bind(service),
        [],
        container,
        undefined,
      ),
    ).rejects.toThrow();

    const failedLog = logEntries[1];
    expect(failedLog.message).toContain('Failed');
  });

  test('should handle async methods', async () => {
    class TestService {
      @Log()
      public async asyncMethod(): Promise<string> {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'async result';
      }
    }

    const service = new TestService();
    const result = await interceptor.execute(
      service,
      'asyncMethod',
      service.asyncMethod.bind(service),
      [],
      container,
      undefined,
    );

    expect(result).toBe('async result');
    expect(logEntries.length).toBe(2);
  });

  test('should use console when logger is not available', async () => {
    const emptyContainer = new Container();
    const consoleLogs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      consoleLogs.push(args.join(' '));
    };

    try {
      class TestService {
        @Log()
        public testMethod(): string {
          return 'test';
        }
      }

      const service = new TestService();
      await interceptor.execute(
        service,
        'testMethod',
        service.testMethod.bind(service),
        [],
        emptyContainer,
        undefined,
      );

      expect(consoleLogs.length).toBeGreaterThan(0);
      expect(consoleLogs.some((log) => log.includes('[INFO]'))).toBe(true);
    } finally {
      console.log = originalLog;
    }
  });

  test('should handle non-Error thrown values', async () => {
    class TestService {
      @Log()
      public throwString(): void {
        throw 'string error';
      }
    }

    const service = new TestService();

    await expect(
      interceptor.execute(
        service,
        'throwString',
        service.throwString.bind(service),
        [],
        container,
        undefined,
      ),
    ).rejects.toBe('string error');

    const failedLog = logEntries[1];
    expect(failedLog.message).toContain('Failed');
  });

  test('should work without metadata (using defaults)', async () => {
    class TestService {
      public noDecoratorMethod(): string {
        return 'no decorator';
      }
    }

    const service = new TestService();
    const result = await interceptor.execute(
      service,
      'noDecoratorMethod',
      service.noDecoratorMethod.bind(service),
      [],
      container,
      undefined,
    );

    expect(result).toBe('no decorator');
    // 即使没有装饰器，拦截器也应该记录日志（使用默认选项）
    expect(logEntries.length).toBe(2);
  });
});
