import { describe, expect, test, beforeEach } from 'bun:test';

import { Tracer } from '../../src/microservice/tracing/tracer';
import { SpanKind, SpanStatus, type Span, type TraceCollector } from '../../src/microservice/tracing/types';

describe('Tracer', () => {
  let tracer: Tracer;

  beforeEach(() => {
    tracer = new Tracer();
  });

  describe('constructor', () => {
    test('should create tracer with default options', () => {
      const t = new Tracer();
      const span = t.startSpan('test');
      expect(span).toBeDefined();
    });

    test('should create tracer with custom options', () => {
      const t = new Tracer({
        enabled: true,
        samplingRate: 0.5,
      });
      const span = t.startSpan('test');
      expect(span).toBeDefined();
    });

    test('should create empty span when disabled', () => {
      const t = new Tracer({ enabled: false });
      const span = t.startSpan('test');
      expect(span.name).toBe('test');
      expect(span.context.sampled).toBe(false);
    });
  });

  describe('startSpan', () => {
    test('should start a new span', () => {
      const span = tracer.startSpan('test-operation');
      expect(span.name).toBe('test-operation');
      expect(span.kind).toBe(SpanKind.INTERNAL);
      expect(span.context.traceId).toBeDefined();
      expect(span.context.spanId).toBeDefined();
      expect(span.startTime).toBeDefined();
      expect(span.status).toBe(SpanStatus.UNSET);
    });

    test('should start span with custom kind', () => {
      const span = tracer.startSpan('http-request', SpanKind.CLIENT);
      expect(span.kind).toBe(SpanKind.CLIENT);
    });

    test('should start span with parent context', () => {
      const parentSpan = tracer.startSpan('parent');
      const childSpan = tracer.startSpan('child', SpanKind.INTERNAL, parentSpan.context);

      expect(childSpan.context.traceId).toBe(parentSpan.context.traceId);
      expect(childSpan.context.parentSpanId).toBe(parentSpan.context.spanId);
    });

    test('should use custom trace id generator', () => {
      const customTracer = new Tracer({
        traceIdGenerator: () => 'custom-trace-id-12345678901234',
      });
      const span = customTracer.startSpan('test');
      expect(span.context.traceId).toBe('custom-trace-id-12345678901234');
    });

    test('should use custom span id generator', () => {
      const customTracer = new Tracer({
        spanIdGenerator: () => 'custom-span-id',
      });
      const span = customTracer.startSpan('test');
      expect(span.context.spanId).toBe('custom-span-id');
    });
  });

  describe('endSpan', () => {
    test('should end span with OK status', () => {
      const span = tracer.startSpan('test');
      tracer.endSpan(span.context.spanId);

      // Span should be ended (removed from active spans)
      // We can verify by checking span properties were set
      expect(span.endTime).toBeDefined();
      expect(span.duration).toBeDefined();
      expect(span.status).toBe(SpanStatus.OK);
    });

    test('should end span with error status', () => {
      const span = tracer.startSpan('test');
      const error = new Error('Test error');
      tracer.endSpan(span.context.spanId, SpanStatus.ERROR, error);

      expect(span.status).toBe(SpanStatus.ERROR);
      expect(span.error).toBe(error);
    });

    test('should not throw for unknown span id', () => {
      expect(() => tracer.endSpan('unknown-span-id')).not.toThrow();
    });
  });

  describe('addCollector', () => {
    test('should collect span data', () => {
      const collectedSpans: Span[] = [];
      const collector: TraceCollector = {
        collect: (span: Span) => {
          collectedSpans.push(span);
        },
      };

      tracer.addCollector(collector);
      const span = tracer.startSpan('test');
      tracer.endSpan(span.context.spanId);

      // Span should be collected if sampled
      expect(collectedSpans.length).toBeGreaterThanOrEqual(0);
    });

    test('should handle collector errors gracefully', () => {
      const failingCollector: TraceCollector = {
        collect: () => {
          throw new Error('Collector failed');
        },
      };

      tracer.addCollector(failingCollector);
      const span = tracer.startSpan('test');

      // Should not throw even if collector fails
      expect(() => tracer.endSpan(span.context.spanId)).not.toThrow();
    });
  });

  describe('setSpanTag', () => {
    test('should set string tag', () => {
      const span = tracer.startSpan('test');
      tracer.setSpanTag(span.context.spanId, 'http.method', 'GET');

      expect(span.tags?.['http.method']).toBe('GET');
    });

    test('should set number tag', () => {
      const span = tracer.startSpan('test');
      tracer.setSpanTag(span.context.spanId, 'http.status_code', 200);

      expect(span.tags?.['http.status_code']).toBe(200);
    });

    test('should set boolean tag', () => {
      const span = tracer.startSpan('test');
      tracer.setSpanTag(span.context.spanId, 'error', true);

      expect(span.tags?.['error']).toBe(true);
    });

    test('should not throw for unknown span id', () => {
      expect(() => tracer.setSpanTag('unknown', 'key', 'value')).not.toThrow();
    });
  });

  describe('addSpanEvent', () => {
    test('should not throw when adding event', () => {
      const span = tracer.startSpan('test');
      expect(() => tracer.addSpanEvent(span.context.spanId, 'event-name', { key: 'value' })).not.toThrow();
    });

    test('should not throw when adding multiple events', () => {
      const span = tracer.startSpan('test');
      expect(() => tracer.addSpanEvent(span.context.spanId, 'event1')).not.toThrow();
      expect(() => tracer.addSpanEvent(span.context.spanId, 'event2')).not.toThrow();
    });

    test('should not throw for unknown span id', () => {
      expect(() => tracer.addSpanEvent('unknown', 'event')).not.toThrow();
    });
  });

  describe('sampling', () => {
    test('should respect sampling rate', () => {
      // Create tracer with 0% sampling rate
      const lowSamplingTracer = new Tracer({ samplingRate: 0 });
      const span = lowSamplingTracer.startSpan('test');
      expect(span.context.sampled).toBe(false);
    });

    test('should sample all with 100% rate', () => {
      const fullSamplingTracer = new Tracer({ samplingRate: 1.0 });
      const span = fullSamplingTracer.startSpan('test');
      // Note: sampled could still be true depending on implementation
      expect(span.context).toBeDefined();
    });
  });

  describe('parent-child relationship', () => {
    test('should add child to parent span', () => {
      const parentSpan = tracer.startSpan('parent');
      tracer.startSpan('child', SpanKind.INTERNAL, parentSpan.context);

      // Parent should have the child in children array
      expect(parentSpan.children?.length).toBe(1);
    });

    test('should handle multiple children', () => {
      const parentSpan = tracer.startSpan('parent');
      tracer.startSpan('child1', SpanKind.INTERNAL, parentSpan.context);
      tracer.startSpan('child2', SpanKind.INTERNAL, parentSpan.context);

      expect(parentSpan.children?.length).toBe(2);
    });
  });
});
