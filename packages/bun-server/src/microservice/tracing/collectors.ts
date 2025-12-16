import type { Span, TraceCollector } from './types';

/**
 * 控制台追踪收集器（用于调试）
 */
export class ConsoleTraceCollector implements TraceCollector {
  public collect(span: Span): void {
    console.log('[Trace]', {
      traceId: span.context.traceId,
      spanId: span.context.spanId,
      name: span.name,
      duration: span.duration,
      status: span.status,
      tags: span.tags,
    });
  }
}

/**
 * 内存追踪收集器（用于测试和开发）
 */
export class MemoryTraceCollector implements TraceCollector {
  private readonly spans: Span[] = [];

  public collect(span: Span): void {
    this.spans.push(span);
  }

  /**
   * 获取所有收集的 Span
   */
  public getSpans(): Span[] {
    return [...this.spans];
  }

  /**
   * 清空收集的 Span
   */
  public clear(): void {
    this.spans.length = 0;
  }

  /**
   * 获取指定 Trace ID 的所有 Span
   */
  public getSpansByTraceId(traceId: string): Span[] {
    return this.spans.filter((span) => span.context.traceId === traceId);
  }
}

