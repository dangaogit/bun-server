import { describe, expect, test, beforeEach } from 'bun:test';

import {
  ConsoleTraceCollector,
  MemoryTraceCollector,
} from '../../src/microservice/tracing/collectors';
import { SpanKind, SpanStatus, type Span } from '../../src/microservice/tracing/types';

describe('ConsoleTraceCollector', () => {
  test('should collect span to console', () => {
    const collector = new ConsoleTraceCollector();
    const span: Span = {
      context: {
        traceId: 'trace-123',
        spanId: 'span-456',
        sampled: true,
      },
      name: 'test-span',
      kind: SpanKind.INTERNAL,
      startTime: Date.now(),
      status: SpanStatus.OK,
      duration: 100,
    };

    // Should not throw
    expect(() => collector.collect(span)).not.toThrow();
  });

  test('should handle span with tags', () => {
    const collector = new ConsoleTraceCollector();
    const span: Span = {
      context: {
        traceId: 'trace-123',
        spanId: 'span-456',
        sampled: true,
      },
      name: 'tagged-span',
      kind: SpanKind.CLIENT,
      startTime: Date.now(),
      status: SpanStatus.OK,
      tags: {
        'http.method': 'GET',
        'http.url': '/api/test',
      },
    };

    expect(() => collector.collect(span)).not.toThrow();
  });
});

describe('MemoryTraceCollector', () => {
  let collector: MemoryTraceCollector;

  beforeEach(() => {
    collector = new MemoryTraceCollector();
  });

  describe('collect', () => {
    test('should store span in memory', () => {
      const span: Span = {
        context: {
          traceId: 'trace-1',
          spanId: 'span-1',
          sampled: true,
        },
        name: 'test',
        kind: SpanKind.INTERNAL,
        startTime: Date.now(),
        status: SpanStatus.OK,
      };

      collector.collect(span);

      const spans = collector.getSpans();
      expect(spans.length).toBe(1);
      expect(spans[0].name).toBe('test');
    });

    test('should store multiple spans', () => {
      for (let i = 0; i < 5; i++) {
        collector.collect({
          context: { traceId: `trace-${i}`, spanId: `span-${i}`, sampled: true },
          name: `span-${i}`,
          kind: SpanKind.INTERNAL,
          startTime: Date.now(),
          status: SpanStatus.OK,
        });
      }

      expect(collector.getSpans().length).toBe(5);
    });
  });

  describe('getSpans', () => {
    test('should return copy of spans', () => {
      const span: Span = {
        context: { traceId: 't1', spanId: 's1', sampled: true },
        name: 'test',
        kind: SpanKind.INTERNAL,
        startTime: Date.now(),
        status: SpanStatus.OK,
      };

      collector.collect(span);

      const spans1 = collector.getSpans();
      const spans2 = collector.getSpans();

      // Should be different arrays
      expect(spans1).not.toBe(spans2);
      expect(spans1).toEqual(spans2);
    });
  });

  describe('clear', () => {
    test('should remove all spans', () => {
      collector.collect({
        context: { traceId: 't1', spanId: 's1', sampled: true },
        name: 'test',
        kind: SpanKind.INTERNAL,
        startTime: Date.now(),
        status: SpanStatus.OK,
      });

      expect(collector.getSpans().length).toBe(1);

      collector.clear();

      expect(collector.getSpans().length).toBe(0);
    });
  });

  describe('getSpansByTraceId', () => {
    test('should filter spans by trace id', () => {
      collector.collect({
        context: { traceId: 'trace-A', spanId: 's1', sampled: true },
        name: 'span-a1',
        kind: SpanKind.INTERNAL,
        startTime: Date.now(),
        status: SpanStatus.OK,
      });
      collector.collect({
        context: { traceId: 'trace-B', spanId: 's2', sampled: true },
        name: 'span-b1',
        kind: SpanKind.INTERNAL,
        startTime: Date.now(),
        status: SpanStatus.OK,
      });
      collector.collect({
        context: { traceId: 'trace-A', spanId: 's3', sampled: true },
        name: 'span-a2',
        kind: SpanKind.INTERNAL,
        startTime: Date.now(),
        status: SpanStatus.OK,
      });

      const traceASpans = collector.getSpansByTraceId('trace-A');

      expect(traceASpans.length).toBe(2);
      expect(traceASpans.every((s) => s.context.traceId === 'trace-A')).toBe(true);
    });

    test('should return empty array for non-existent trace id', () => {
      const spans = collector.getSpansByTraceId('non-existent');
      expect(spans).toEqual([]);
    });
  });
});
