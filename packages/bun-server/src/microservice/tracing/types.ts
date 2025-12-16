/**
 * Trace ID 类型
 */
export type TraceId = string;

/**
 * Span ID 类型
 */
export type SpanId = string;

/**
 * Span 状态
 */
export enum SpanStatus {
  /**
   * 未设置
   */
  UNSET = 'UNSET',

  /**
   * 成功
   */
  OK = 'OK',

  /**
   * 错误
   */
  ERROR = 'ERROR',
}

/**
 * Span 类型
 */
export enum SpanKind {
  /**
   * 客户端（发起请求）
   */
  CLIENT = 'CLIENT',

  /**
   * 服务端（处理请求）
   */
  SERVER = 'SERVER',

  /**
   * 内部（内部操作）
   */
  INTERNAL = 'INTERNAL',
}

/**
 * Span 上下文
 */
export interface SpanContext {
  /**
   * Trace ID
   */
  traceId: TraceId;

  /**
   * Span ID
   */
  spanId: SpanId;

  /**
   * 父 Span ID（可选）
   */
  parentSpanId?: SpanId;

  /**
   * 是否采样
   */
  sampled?: boolean;

  /**
   * 标志位（用于传播）
   */
  flags?: number;
}

/**
 * Span 标签
 */
export type SpanTags = Record<string, string | number | boolean>;

/**
 * Span 事件
 */
export interface SpanEvent {
  /**
   * 事件名称
   */
  name: string;

  /**
   * 时间戳（毫秒）
   */
  timestamp: number;

  /**
   * 事件属性
   */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Span 数据
 */
export interface Span {
  /**
   * Span 上下文
   */
  context: SpanContext;

  /**
   * Span 名称
   */
  name: string;

  /**
   * Span 类型
   */
  kind: SpanKind;

  /**
   * 开始时间（毫秒）
   */
  startTime: number;

  /**
   * 结束时间（毫秒，可选）
   */
  endTime?: number;

  /**
   * 持续时间（毫秒）
   */
  duration?: number;

  /**
   * 状态
   */
  status: SpanStatus;

  /**
   * 错误信息（可选）
   */
  error?: Error;

  /**
   * 标签
   */
  tags?: SpanTags;

  /**
   * 事件列表
   */
  events?: SpanEvent[];

  /**
   * 子 Span 列表
   */
  children?: Span[];
}

/**
 * 追踪配置选项
 */
export interface TracingOptions {
  /**
   * 采样率（0-1）
   * @default 1.0
   */
  samplingRate?: number;

  /**
   * 是否启用追踪
   * @default true
   */
  enabled?: boolean;

  /**
   * Trace ID 生成器
   */
  traceIdGenerator?: () => TraceId;

  /**
   * Span ID 生成器
   */
  spanIdGenerator?: () => SpanId;
}

/**
 * 追踪数据收集器接口
 */
export interface TraceCollector {
  /**
   * 收集 Span 数据
   * @param span - Span 数据
   */
  collect(span: Span): void | Promise<void>;

  /**
   * 刷新数据（可选）
   */
  flush?(): void | Promise<void>;

  /**
   * 关闭收集器
   */
  close?(): void | Promise<void>;
}

