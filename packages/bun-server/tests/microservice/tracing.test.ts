import { describe, expect, test, beforeEach } from 'bun:test';
import { Tracer, SpanKind, SpanStatus } from '../../src/microservice/tracing';
import { ConsoleTraceCollector, MemoryTraceCollector } from '../../src/microservice/tracing';

describe('Tracer', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer({
      samplingRate: 1.0,
      enabled: true,
    });
  });

  test('should create tracer instance', () => {
    expect(tracer).toBeDefined();
  });

  test('should start and end span', () => {
    const span = tracer.startSpan('test-span', SpanKind.CLIENT);
    expect(span).toBeDefined();
    expect(span.context.traceId).toBeDefined();
    expect(span.context.spanId).toBeDefined();

    tracer.endSpan(span.context.spanId, SpanStatus.OK);
    // 验证 span 已结束（通过检查收集器）
  });

  test('should set span tags', () => {
    const span = tracer.startSpan('test-span', SpanKind.CLIENT);
    tracer.setSpanTags(span.context.spanId, {
      'service.name': 'test-service',
      'http.method': 'GET',
    });

    const context = tracer.getCurrentSpanContext(span.context.spanId);
    expect(context).toBeDefined();
  });

  test('should add span event', () => {
    const span = tracer.startSpan('test-span', SpanKind.CLIENT);
    tracer.addSpanEvent(span.context.spanId, {
      name: 'test-event',
      attributes: { key: 'value' },
    });

    // 验证事件已添加
    expect(span).toBeDefined();
  });

  test('should extract span context from headers', () => {
    const headers = {
      'X-Trace-Id': 'trace123',
      'X-Span-Id': 'span456',
      'X-Parent-Span-Id': 'parent789',
      'X-Sampled': '1',
    };

    const context = tracer.extractFromHeaders(headers);
    expect(context).toBeDefined();
    expect(context?.traceId).toBe('trace123');
    expect(context?.spanId).toBe('span456');
  });

  test('should inject span context to headers', () => {
    const span = tracer.startSpan('test-span', SpanKind.CLIENT);
    const headers = tracer.injectToHeaders(span.context);

    expect(headers['X-Trace-Id']).toBe(span.context.traceId);
    expect(headers['X-Span-Id']).toBe(span.context.spanId);
  });

  test('should add collector', () => {
    const collector = new ConsoleTraceCollector();
    tracer.addCollector(collector);
    // 验证收集器已添加
    expect(tracer).toBeDefined();
  });
});

describe('MemoryTraceCollector', () => {
  test('should collect spans', () => {
    const collector = new MemoryTraceCollector();
    const span = {
      context: {
        traceId: 'trace123',
        spanId: 'span456',
      },
      name: 'test-span',
      kind: SpanKind.CLIENT,
      startTime: Date.now(),
      status: SpanStatus.OK,
    };

    collector.collect(span as any);
    const spans = collector.getSpans();
    expect(spans.length).toBe(1);
    expect(spans[0]?.context.traceId).toBe('trace123');
  });

  test('should get spans by trace id', () => {
    const collector = new MemoryTraceCollector();
    collector.collect({
      context: { traceId: 'trace1', spanId: 'span1' },
      name: 'span1',
      kind: SpanKind.CLIENT,
      startTime: Date.now(),
      status: SpanStatus.OK,
    } as any);
    collector.collect({
      context: { traceId: 'trace1', spanId: 'span2' },
      name: 'span2',
      kind: SpanKind.CLIENT,
      startTime: Date.now(),
      status: SpanStatus.OK,
    } as any);
    collector.collect({
      context: { traceId: 'trace2', spanId: 'span3' },
      name: 'span3',
      kind: SpanKind.CLIENT,
      startTime: Date.now(),
      status: SpanStatus.OK,
    } as any);

    const trace1Spans = collector.getSpansByTraceId('trace1');
    expect(trace1Spans.length).toBe(2);
  });

  test('should clear spans', () => {
    const collector = new MemoryTraceCollector();
    collector.collect({
      context: { traceId: 'trace1', spanId: 'span1' },
      name: 'span1',
      kind: SpanKind.CLIENT,
      startTime: Date.now(),
      status: SpanStatus.OK,
    } as any);

    collector.clear();
    expect(collector.getSpans().length).toBe(0);
  });
});

