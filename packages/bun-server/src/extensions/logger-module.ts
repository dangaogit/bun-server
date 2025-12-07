import { Module, MODULE_METADATA_KEY } from '../di/module';
import { LoggerExtension } from './logger-extension';
import { createLoggerMiddleware } from '../middleware/builtin';
import type { LoggerOptions } from '@dangao/logsmith';

/**
 * Logger 模块配置
 */
export interface LoggerModuleOptions {
  /**
   * Logger 选项
   */
  logger?: LoggerOptions;
  /**
   * 是否启用请求日志中间件
   */
  enableRequestLogging?: boolean;
  /**
   * 请求日志中间件前缀
   */
  requestLoggingPrefix?: string;
}

/**
 * Logger 模块
 * 提供日志功能和请求日志中间件
 */
@Module({
  extensions: [
    // 将在运行时根据配置创建
  ],
  middlewares: [
    // 将在运行时根据配置创建
  ],
})
export class LoggerModule {
  /**
   * 创建 Logger 模块
   * @param options - 模块配置
   */
  public static forRoot(options: LoggerModuleOptions = {}): typeof LoggerModule {
    const extensions: any[] = [];
    const middlewares: any[] = [];

    // 创建 Logger 扩展
    const loggerExtension = new LoggerExtension(options.logger);
    extensions.push(loggerExtension);

    // 如果启用请求日志，添加中间件
    if (options.enableRequestLogging !== false) {
      const requestLoggingMiddleware = createLoggerMiddleware({
        prefix: options.requestLoggingPrefix,
      });
      middlewares.push(requestLoggingMiddleware);
    }

    // 动态更新模块元数据
    const existingMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, LoggerModule) || {};
    const metadata = {
      ...existingMetadata,
      extensions,
      middlewares,
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, LoggerModule);

    return LoggerModule;
  }
}

