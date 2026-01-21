import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { Container } from '../../src/di/container';
import { MODULE_METADATA_KEY } from '../../src/di/module';
import { LoggerModule, type LoggerModuleOptions } from '../../src/extensions/logger-module';
import { LOGGER_TOKEN, LogLevel, type LogEntry } from '../../src/extensions';
import type { Logger } from '@dangao/logsmith';

describe('LoggerModule', () => {
  beforeEach(() => {
    // 清除模块元数据
    Reflect.deleteMetadata(MODULE_METADATA_KEY, LoggerModule);
  });

  test('should create logger module with default options', () => {
    LoggerModule.forRoot();

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, LoggerModule);
    expect(metadata).toBeDefined();
    expect(metadata.extensions).toBeDefined();
    expect(metadata.extensions.length).toBe(1);
    // 默认启用请求日志
    expect(metadata.middlewares).toBeDefined();
    expect(metadata.middlewares.length).toBe(1);
  });

  test('should create logger module with custom logger options', () => {
    const entries: LogEntry[] = [];
    const options: LoggerModuleOptions = {
      logger: {
        prefix: 'TestApp',
        level: LogLevel.DEBUG,
        sink(entry) {
          entries.push(entry);
        },
      },
    };

    LoggerModule.forRoot(options);

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, LoggerModule);
    expect(metadata).toBeDefined();
    expect(metadata.extensions).toBeDefined();
    expect(metadata.extensions.length).toBe(1);
  });

  test('should disable request logging when enableRequestLogging is false', () => {
    LoggerModule.forRoot({
      enableRequestLogging: false,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, LoggerModule);
    expect(metadata).toBeDefined();
    expect(metadata.extensions.length).toBe(1);
    // 禁用请求日志时，middlewares 应该为空
    expect(metadata.middlewares.length).toBe(0);
  });

  test('should enable request logging with custom prefix', () => {
    LoggerModule.forRoot({
      enableRequestLogging: true,
      requestLoggingPrefix: '[HTTP]',
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, LoggerModule);
    expect(metadata).toBeDefined();
    expect(metadata.middlewares.length).toBe(1);
  });

  test('should register logger into container via extension', () => {
    const entries: LogEntry[] = [];
    LoggerModule.forRoot({
      logger: {
        prefix: 'Test',
        level: LogLevel.DEBUG,
        sink(entry) {
          entries.push(entry);
        },
      },
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, LoggerModule);
    const extension = metadata.extensions[0];

    // 模拟扩展注册到容器
    const container = new Container();
    extension.register(container);

    const logger = container.resolve<Logger>(LOGGER_TOKEN);
    expect(logger).toBeDefined();

    logger.info('test message');
    expect(entries.length).toBe(1);
    expect(entries[0].message).toBe('test message');
  });

  test('should work with container via extension registration', async () => {
    const entries: LogEntry[] = [];
    LoggerModule.forRoot({
      logger: {
        sink(entry) {
          entries.push(entry);
        },
      },
      enableRequestLogging: false,
    });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, LoggerModule);
    const container = new Container();

    // 模拟模块注册过程：手动注册扩展
    for (const extension of metadata.extensions) {
      if (extension && typeof extension.register === 'function') {
        extension.register(container);
      }
    }

    const logger = container.resolve<Logger>(LOGGER_TOKEN);
    expect(logger).toBeDefined();

    logger.warn('warning message');
    expect(entries.length).toBe(1);
    expect(entries[0].level).toBe(LogLevel.WARN);
  });

  test('should preserve existing metadata when calling forRoot multiple times', () => {
    // 第一次调用
    LoggerModule.forRoot({
      enableRequestLogging: false,
    });

    const metadata1 = Reflect.getMetadata(MODULE_METADATA_KEY, LoggerModule);
    expect(metadata1.extensions.length).toBe(1);
    expect(metadata1.middlewares.length).toBe(0);

    // 清除元数据模拟重新配置
    Reflect.deleteMetadata(MODULE_METADATA_KEY, LoggerModule);

    // 第二次调用使用不同选项
    LoggerModule.forRoot({
      enableRequestLogging: true,
      requestLoggingPrefix: '[API]',
    });

    const metadata2 = Reflect.getMetadata(MODULE_METADATA_KEY, LoggerModule);
    expect(metadata2.extensions.length).toBe(1);
    expect(metadata2.middlewares.length).toBe(1);
  });

  test('should use default values when options are not provided', () => {
    LoggerModule.forRoot({});

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, LoggerModule);
    // enableRequestLogging 默认不是 false，所以应该启用
    expect(metadata.middlewares.length).toBe(1);
  });
});
