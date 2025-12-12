import 'reflect-metadata';
import { BaseInterceptor } from '../base-interceptor';
import type { Container } from '../../di/container';
import type { Context } from '../../core/context';
import { LOGGER_TOKEN } from '../../extensions';
import type { Logger } from '@dangao/logsmith';

/**
 * 日志元数据键
 */
export const LOG_METADATA_KEY = Symbol('@dangao/bun-server:interceptor:log');

/**
 * 日志配置选项
 */
export interface LogOptions {
  /**
   * 日志级别
   * @default 'info'
   */
  level?: 'debug' | 'info' | 'warn' | 'error';

  /**
   * 自定义日志消息（可选）
   * 如果不提供，将使用方法名
   */
  message?: string;

  /**
   * 是否记录方法参数
   * @default false
   */
  logArgs?: boolean;

  /**
   * 是否记录返回值
   * @default false
   */
  logResult?: boolean;

  /**
   * 是否记录执行时间
   * @default true
   */
  logDuration?: boolean;
}

/**
 * 日志装饰器
 * 标记方法需要记录日志
 * @param options - 日志配置选项
 */
export function Log(options: LogOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    const metadata: LogOptions = {
      level: options.level || 'info',
      message: options.message,
      logArgs: options.logArgs ?? false,
      logResult: options.logResult ?? false,
      logDuration: options.logDuration ?? true,
    };
    Reflect.defineMetadata(LOG_METADATA_KEY, metadata, target, propertyKey);
  };
}

/**
 * 获取日志元数据
 */
export function getLogMetadata(
  target: unknown,
  propertyKey: string | symbol,
): LogOptions | undefined {
  if (typeof target === 'object' && target !== null) {
    return Reflect.getMetadata(LOG_METADATA_KEY, target, propertyKey);
  }
  return undefined;
}

/**
 * 日志拦截器
 * 记录方法执行日志，包括执行时间、参数和返回值
 */
export class LogInterceptor extends BaseInterceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    const options = this.getMetadata<LogOptions>(target, propertyKey, LOG_METADATA_KEY) || {};
    const level = options.level || 'info';
    const methodName = String(propertyKey);
    const logMessage = options.message || `Executing ${methodName}`;
    const logArgs = options.logArgs ?? false;
    const logResult = options.logResult ?? false;
    const logDuration = options.logDuration ?? true;

    // Try to resolve logger from container
    let logger: Logger | undefined;
    try {
      logger = container.resolve<Logger>(LOGGER_TOKEN);
    } catch {
      // Logger not available, use console
    }

    const log = (msg: string, data?: unknown) => {
      if (logger) {
        switch (level) {
          case 'debug':
            logger.debug(msg, data);
            break;
          case 'info':
            logger.info(msg, data);
            break;
          case 'warn':
            logger.warn(msg, data);
            break;
          case 'error':
            logger.error(msg, data);
            break;
        }
      } else {
        console.log(`[${level.toUpperCase()}] ${msg}`, data || '');
      }
    };

    const startTime = logDuration ? performance.now() : undefined;

    // Log start
    if (logArgs && args.length > 0) {
      log(`${logMessage} - Start`, { args });
    } else {
      log(`${logMessage} - Start`);
    }

    try {
      // Execute original method
      const result = await Promise.resolve(originalMethod.apply(target, args));

      // Calculate duration
      const duration = startTime ? performance.now() - startTime : undefined;

      // Log completion
      const logData: Record<string, unknown> = {};
      if (duration !== undefined) {
        logData.duration = `${duration.toFixed(2)}ms`;
      }
      if (logResult) {
        logData.result = result;
      }

      if (Object.keys(logData).length > 0) {
        log(`${logMessage} - Completed`, logData);
      } else {
        log(`${logMessage} - Completed`);
      }

      return result;
    } catch (error) {
      // Calculate duration even on error
      const duration = startTime ? performance.now() - startTime : undefined;

      // Log error
      const errorMessage = error instanceof Error ? error.message : String(error);
      const logData: Record<string, unknown> = { error: errorMessage };
      if (duration !== undefined) {
        logData.duration = `${duration.toFixed(2)}ms`;
      }

      log(`${logMessage} - Failed`, logData);

      throw error;
    }
  }
}

