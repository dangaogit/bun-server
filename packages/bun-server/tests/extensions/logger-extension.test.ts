import { describe, expect, test } from 'bun:test';

import { Container } from '../../src/di/container';
import { LoggerExtension, LOGGER_TOKEN, LogLevel, type LogEntry } from '../../src/extensions';
import type { Logger } from '../../src/extensions';

describe('LoggerExtension', () => {
  test('should register logger instance into container', () => {
    const container = new Container();
    const extension = new LoggerExtension({ prefix: 'Test', level: LogLevel.DEBUG });

    extension.register(container);

    const logger = container.resolve(LOGGER_TOKEN) as Logger;
    expect(logger).toBeDefined();
    expect(() => logger.info('hello')).not.toThrow();
  });

  test('should use custom sink function', () => {
    const container = new Container();
    const entries: LogEntry[] = [];

    const extension = new LoggerExtension({
      sink(entry) {
        entries.push(entry);
      },
    });

    extension.register(container);

    const logger = container.resolve(LOGGER_TOKEN) as Logger;
    logger.warn('warn message');

    expect(entries.length).toBe(1);
    expect(entries[0].message).toBe('warn message');
    expect(entries[0].level).toBe(LogLevel.WARN);
  });
});


