import {
  SpanKind,
  SpanStatus,
  type TraceId,
  type SpanId,
  type SpanContext,
  type Span,
  type SpanTags,
  type SpanEvent,
  type TracingOptions,
  type TraceCollector,
} from './types';

/**
 * Trace ID 生成器（默认实现）
 */
function generateTraceId(): TraceId {
  // 生成 32 位十六进制字符串（类似 OpenTelemetry）
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars[Math.floor(Math.random() * 16)]!;
  }
  return result;
}

/**
 * Span ID 生成器（默认实现）
 */
function generateSpanId(): SpanId {
  // 生成 16 位十六进制字符串
  const chars = '0123456789abcdef';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars[Math.floor(Math.random() * 16)]!;
  }
  return result;
}

/**
 * 分布式追踪器
 */
export class Tracer {
  private readonly options: Required<Pick<TracingOptions, 'samplingRate' | 'enabled'>> & {
    traceIdGenerator: () => TraceId;
    spanIdGenerator: () => SpanId;
  };
  private readonly collectors: TraceCollector[] = [];
  private readonly activeSpans: Map<SpanId, Span> = new Map();

  public constructor(options: TracingOptions = {}) {
    this.options = {
      samplingRate: options.samplingRate ?? 1.0,
      enabled: options.enabled ?? true,
      traceIdGenerator: options.traceIdGenerator ?? generateTraceId,
      spanIdGenerator: options.spanIdGenerator ?? generateSpanId,
    };
  }

  /**
   * 添加追踪数据收集器
   */
  public addCollector(collector: TraceCollector): void {
    this.collectors.push(collector);
  }

  /**
   * 开始新的 Span
   */
  public startSpan(
    name: string,
    kind: SpanKind = SpanKind.INTERNAL,
    parentContext?: SpanContext,
  ): Span {
    if (!this.options.enabled) {
      // 如果未启用，返回一个空的 Span
      return this.createEmptySpan(name, kind, parentContext);
    }

    // 决定是否采样
    const sampled = Math.random() < this.options.samplingRate;

    const traceId = parentContext?.traceId ?? this.options.traceIdGenerator();
    const spanId = this.options.spanIdGenerator();

    const span: Span = {
      context: {
        traceId,
        spanId,
        parentSpanId: parentContext?.spanId,
        sampled,
      },
      name,
      kind,
      startTime: Date.now(),
      status: SpanStatus.UNSET,
    };

    // 如果有父 Span，将其添加到父 Span 的 children 中
    if (parentContext?.spanId) {
      const parentSpan = this.activeSpans.get(parentContext.spanId);
      if (parentSpan) {
        if (!parentSpan.children) {
          parentSpan.children = [];
        }
        parentSpan.children.push(span);
      }
    }

    this.activeSpans.set(spanId, span);

    return span;
  }

  /**
   * 结束 Span
   */
  public endSpan(spanId: SpanId, status: SpanStatus = SpanStatus.OK, error?: Error): void {
    const span = this.activeSpans.get(spanId);
    if (!span) {
      return;
    }

    span.endTime = Date.now();
    span.duration = span.endTime - span.startTime;
    span.status = status;
    if (error) {
      span.error = error;
    }

    // 收集 Span 数据
    if (span.context.sampled) {
      for (const collector of this.collectors) {
        try {
          collector.collect(span);
        } catch (err) {
          console.error('[Tracer] Failed to collect span:', err);
        }
      }
    }

    // 从活跃 Span 列表中移除
    this.activeSpans.delete(spanId);
  }

  /**
   * 设置 Span 标签
   */
  public setSpanTag(spanId: SpanId, key: string, value: string | number | boolean): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      if (!span.tags) {
        span.tags = {};
      }
      span.tags[key] = value;
    }
  }

  /**
   * 设置 Span 标签（批量）
   */
  public setSpanTags(spanId: SpanId, tags: SpanTags): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      if (!span.tags) {
        span.tags = {};
      }
      Object.assign(span.tags, tags);
    }
  }

  /**
   * 添加 Span 事件
   */
  public addSpanEvent(spanId: SpanId, event: Omit<SpanEvent, 'timestamp'>): void {
    const span = this.activeSpans.get(spanId);
    if (span) {
      if (!span.events) {
        span.events = [];
      }
      span.events.push({
        ...event,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 获取当前 Span 上下文（用于传播）
   */
  public getCurrentSpanContext(spanId: SpanId): SpanContext | undefined {
    const span = this.activeSpans.get(spanId);
    return span?.context;
  }

  /**
   * 从 HTTP 头中提取 Span 上下文
   */
  public extractFromHeaders(headers: Record<string, string>): SpanContext | undefined {
    const traceId = headers['x-trace-id'] || headers['X-Trace-Id'];
    const spanId = headers['x-span-id'] || headers['X-Span-Id'];
    const parentSpanId = headers['x-parent-span-id'] || headers['X-Parent-Span-Id'];
    const sampled = headers['x-sampled'] || headers['X-Sampled'];

    if (traceId && spanId) {
      return {
        traceId,
        spanId,
        parentSpanId,
        sampled: sampled === 'true' || sampled === '1',
      };
    }

    return undefined;
  }

  /**
   * 将 Span 上下文注入到 HTTP 头中
   */
  public injectToHeaders(context: SpanContext): Record<string, string> {
    const headers: Record<string, string> = {
      'X-Trace-Id': context.traceId,
      'X-Span-Id': context.spanId,
    };

    if (context.parentSpanId) {
      headers['X-Parent-Span-Id'] = context.parentSpanId;
    }

    if (context.sampled !== undefined) {
      headers['X-Sampled'] = context.sampled ? '1' : '0';
    }

    return headers;
  }

  /**
   * 创建空的 Span（未启用追踪时使用）
   */
  private createEmptySpan(
    name: string,
    kind: SpanKind,
    parentContext?: SpanContext,
  ): Span {
    return {
      context: {
        traceId: parentContext?.traceId ?? '',
        spanId: '',
        parentSpanId: parentContext?.spanId,
        sampled: false,
      },
      name,
      kind,
      startTime: Date.now(),
      status: SpanStatus.UNSET,
    };
  }

  /**
   * 刷新所有收集器
   */
  public async flush(): Promise<void> {
    for (const collector of this.collectors) {
      if (collector.flush) {
        try {
          await Promise.resolve(collector.flush());
        } catch (err) {
          console.error('[Tracer] Failed to flush collector:', err);
        }
      }
    }
  }

  /**
   * 关闭追踪器
   */
  public async close(): Promise<void> {
    await this.flush();

    for (const collector of this.collectors) {
      if (collector.close) {
        try {
          await Promise.resolve(collector.close());
        } catch (err) {
          console.error('[Tracer] Failed to close collector:', err);
        }
      }
    }

    this.activeSpans.clear();
  }
}

