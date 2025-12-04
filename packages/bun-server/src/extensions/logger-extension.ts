import type { Container } from '../di/container';
import type { ApplicationExtension } from './types';
import {
  LoggerManager,
  LogLevel,
  SimpleLogger,
  type LoggerOptions,
} from '@dangao/logsmith';

export const LOGGER_TOKEN = Symbol('bun-server:logger');

/**
 * Bun Server Logger Provider
 */
export class LoggerExtension implements ApplicationExtension {
  private readonly options: LoggerOptions;

  public constructor(options: LoggerOptions = {}) {
    this.options = {
      level: LogLevel.INFO,
      ...options,
    };
  }

  public register(container: Container): void {
    const logger = new SimpleLogger(this.options);
    LoggerManager.setLogger(logger);
    container.registerInstance(SimpleLogger, logger);
    container.registerInstance(LOGGER_TOKEN, logger);
  }
}

