export enum LogLevel {
  TRACE = 0,
  DEBUG = 1,
  INFO = 2,
  WARN = 3,
  ERROR = 4,
}

export interface LogEntry {
  level: LogLevel;
  levelLabel: string;
  message: string;
  args: unknown[];
  prefix?: string;
  timestamp: Date;
}

export type LogSink = (entry: LogEntry) => void;

export interface LoggerOptions {
  prefix?: string;
  level?: LogLevel;
  sink?: LogSink;
  /**
   * 是否启用颜色输出，默认 true
   */
  colorize?: boolean;
  /**
   * 自定义颜色映射
   */
  colors?: Partial<Record<LogLevel, string>>;
  /**
   * 时间格式，默认 yyyy-MM-dd HH:mm:ss.S
   */
  timeFormat?: string;
}

export interface Logger {
  log(level: LogLevel, message: string, ...args: unknown[]): void;
  trace(message: string, ...args: unknown[]): void;
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

const LEVEL_LABELS: Record<LogLevel, string> = {
  [LogLevel.TRACE]: 'TRACE',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.ERROR]: 'ERROR',
};

export class SimpleLogger implements Logger {
  private readonly prefix?: string;
  private readonly level: LogLevel;
  private readonly sink: LogSink;
  private readonly colorize: boolean;
  private readonly colors: Partial<Record<LogLevel, string>>;
  private readonly timeFormat: string;

  public constructor(options: LoggerOptions = {}) {
    this.prefix = options.prefix;
    this.level = options.level ?? LogLevel.INFO;
    this.sink = options.sink ?? this.createConsoleSink();
    this.colorize = options.colorize ?? true;
    this.timeFormat = options.timeFormat ?? 'yyyy-MM-dd HH:mm:ss.S';
    this.colors = {
      [LogLevel.TRACE]: '\x1b[90m',
      [LogLevel.DEBUG]: '\x1b[34m',
      [LogLevel.INFO]: '\x1b[32m',
      [LogLevel.WARN]: '\x1b[33m',
      [LogLevel.ERROR]: '\x1b[31m',
      ...options.colors,
    };
  }

  public log(level: LogLevel, message: string, ...args: unknown[]): void {
    if (level < this.level) {
      return;
    }

    const entry: LogEntry = {
      level,
      levelLabel: LEVEL_LABELS[level],
      message,
      args,
      prefix: this.prefix,
      timestamp: new Date(),
    };

    this.sink(entry);
  }

  public trace(message: string, ...args: unknown[]): void {
    this.log(LogLevel.TRACE, message, ...args);
  }

  public debug(message: string, ...args: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  public info(message: string, ...args: unknown[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  public warn(message: string, ...args: unknown[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  public error(message: string, ...args: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  private createConsoleSink(): LogSink {
    return (entry) => {
      const prefix = entry.prefix ? `[${entry.prefix}]` : '';
      const label = `[${entry.levelLabel}]`;
      const time = this.formatTime(entry.timestamp);
      const line = `${time}${prefix}${label} ${entry.message}`;
      const colored = this.colorizeLine(entry.level, line);

      console.log(colored, ...entry.args);
    };
  }

  private colorizeLine(level: LogLevel, line: string): string {
    if (!this.colorize) {
      return line;
    }
    const colorCode = this.colors[level];
    if (!colorCode) {
      return line;
    }
    const RESET = '\x1b[0m';
    return `${colorCode}${line}${RESET}`;
  }

  private formatTime(date: Date): string {
    const replacements: Record<string, string> = {
      yyyy: date.getFullYear().toString().padStart(4, '0'),
      MM: (date.getMonth() + 1).toString().padStart(2, '0'),
      dd: date.getDate().toString().padStart(2, '0'),
      HH: date.getHours().toString().padStart(2, '0'),
      mm: date.getMinutes().toString().padStart(2, '0'),
      ss: date.getSeconds().toString().padStart(2, '0'),
      S: date.getMilliseconds().toString().padStart(3, '0'),
    };

    let formatted = this.timeFormat;
    (['yyyy', 'MM', 'dd', 'HH', 'mm', 'ss', 'S'] as const).forEach((token) => {
      formatted = formatted.replace(token, replacements[token] ?? '');
    });
    return formatted;
  }
}

export class LoggerManager {
  private static current: Logger | undefined;

  public static setLogger(logger: Logger): void {
    this.current = logger;
  }

  public static getLogger(): Logger {
    if (!this.current) {
      this.current = new SimpleLogger({ prefix: '@dangao/logsmith' });
    }
    return this.current;
  }
}

