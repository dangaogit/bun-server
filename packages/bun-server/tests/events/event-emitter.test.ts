import { describe, expect, test, beforeEach, mock } from 'bun:test';
import { EventEmitterService } from '../../src/events/service';
import type { EventEmitter, EventModuleOptions } from '../../src/events/types';

describe('EventEmitterService', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitterService();
  });

  describe('on() and emit()', () => {
    test('should register and trigger listener', () => {
      const listener = mock(() => {});
      emitter.on('test.event', listener);
      emitter.emit('test.event', { data: 'hello' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ data: 'hello' });
    });

    test('should support multiple listeners for same event', () => {
      const listener1 = mock(() => {});
      const listener2 = mock(() => {});

      emitter.on('test.event', listener1);
      emitter.on('test.event', listener2);
      emitter.emit('test.event', 'payload');

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    test('should not trigger listener for different event', () => {
      const listener = mock(() => {});
      emitter.on('test.event1', listener);
      emitter.emit('test.event2', 'payload');

      expect(listener).not.toHaveBeenCalled();
    });

    test('should support Symbol as event name', () => {
      const eventSymbol = Symbol('test.event');
      const listener = mock(() => {});

      emitter.on(eventSymbol, listener);
      emitter.emit(eventSymbol, { key: 'value' });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith({ key: 'value' });
    });

    test('should return unsubscribe function', () => {
      const listener = mock(() => {});
      const unsubscribe = emitter.on('test.event', listener);

      emitter.emit('test.event', 'first');
      expect(listener).toHaveBeenCalledTimes(1);

      unsubscribe();
      emitter.emit('test.event', 'second');
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('once()', () => {
    test('should only trigger listener once', () => {
      const listener = mock(() => {});
      emitter.once('test.event', listener);

      emitter.emit('test.event', 'first');
      emitter.emit('test.event', 'second');

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener).toHaveBeenCalledWith('first');
    });

    test('should return unsubscribe function', () => {
      const listener = mock(() => {});
      const unsubscribe = emitter.once('test.event', listener);

      unsubscribe();
      emitter.emit('test.event', 'payload');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('off()', () => {
    test('should remove specific listener', () => {
      const listener1 = mock(() => {});
      const listener2 = mock(() => {});

      emitter.on('test.event', listener1);
      emitter.on('test.event', listener2);
      emitter.off('test.event', listener1);
      emitter.emit('test.event', 'payload');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    test('should do nothing if listener not found', () => {
      const listener = mock(() => {});
      emitter.off('test.event', listener); // 不抛出错误
    });
  });

  describe('removeAllListeners()', () => {
    test('should remove all listeners for specific event', () => {
      const listener1 = mock(() => {});
      const listener2 = mock(() => {});

      emitter.on('event1', listener1);
      emitter.on('event2', listener2);
      emitter.removeAllListeners('event1');

      emitter.emit('event1', 'payload');
      emitter.emit('event2', 'payload');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledTimes(1);
    });

    test('should remove all listeners when no event specified', () => {
      const listener1 = mock(() => {});
      const listener2 = mock(() => {});

      emitter.on('event1', listener1);
      emitter.on('event2', listener2);
      emitter.removeAllListeners();

      emitter.emit('event1', 'payload');
      emitter.emit('event2', 'payload');

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).not.toHaveBeenCalled();
    });
  });

  describe('listenerCount()', () => {
    test('should return correct listener count', () => {
      expect(emitter.listenerCount('test.event')).toBe(0);

      emitter.on('test.event', () => {});
      expect(emitter.listenerCount('test.event')).toBe(1);

      emitter.on('test.event', () => {});
      expect(emitter.listenerCount('test.event')).toBe(2);
    });
  });

  describe('eventNames()', () => {
    test('should return all registered event names', () => {
      const symbol = Symbol('symbol.event');
      emitter.on('string.event', () => {});
      emitter.on(symbol, () => {});

      const names = emitter.eventNames();
      expect(names).toContain('string.event');
      expect(names).toContain(symbol);
      expect(names.length).toBe(2);
    });

    test('should return empty array when no listeners', () => {
      expect(emitter.eventNames()).toEqual([]);
    });
  });

  describe('priority', () => {
    test('should execute listeners in priority order (high to low)', () => {
      const order: number[] = [];

      emitter.on('test.event', () => order.push(1), { priority: 1 });
      emitter.on('test.event', () => order.push(3), { priority: 3 });
      emitter.on('test.event', () => order.push(2), { priority: 2 });

      emitter.emit('test.event', null);

      expect(order).toEqual([3, 2, 1]);
    });

    test('should use default priority 0 when not specified', () => {
      const order: number[] = [];

      emitter.on('test.event', () => order.push(1)); // priority: 0
      emitter.on('test.event', () => order.push(2), { priority: 1 });
      emitter.on('test.event', () => order.push(3), { priority: -1 });

      emitter.emit('test.event', null);

      expect(order).toEqual([2, 1, 3]);
    });
  });

  describe('emitAsync()', () => {
    test('should wait for all async listeners to complete', async () => {
      const results: number[] = [];

      emitter.on('test.event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        results.push(1);
      });

      emitter.on('test.event', async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        results.push(2);
      });

      await emitter.emitAsync('test.event', null);

      expect(results.length).toBe(2);
      expect(results).toContain(1);
      expect(results).toContain(2);
    });

    test('should handle sync listeners in emitAsync', async () => {
      const listener = mock(() => {});
      emitter.on('test.event', listener);

      await emitter.emitAsync('test.event', 'payload');

      expect(listener).toHaveBeenCalledTimes(1);
    });

    test('should remove once listeners after emitAsync', async () => {
      const listener = mock(() => {});
      emitter.once('test.event', listener);

      await emitter.emitAsync('test.event', 'first');
      await emitter.emitAsync('test.event', 'second');

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('error handling', () => {
    test('should continue execution when listener throws sync error', () => {
      const consoleSpy = mock(() => {});
      const originalError = console.error;
      console.error = consoleSpy;

      const listener1 = mock(() => {
        throw new Error('Test error');
      });
      const listener2 = mock(() => {});

      emitter.on('test.event', listener1);
      emitter.on('test.event', listener2);
      emitter.emit('test.event', 'payload');

      expect(listener1).toHaveBeenCalledTimes(1);
      expect(listener2).toHaveBeenCalledTimes(1);
      expect(consoleSpy).toHaveBeenCalled();

      console.error = originalError;
    });

    test('should use custom error handler when provided', () => {
      const errorHandler = mock(() => {});
      const emitterWithErrorHandler = new EventEmitterService({
        onError: errorHandler,
      });

      emitterWithErrorHandler.on('test.event', () => {
        throw new Error('Custom error');
      });
      emitterWithErrorHandler.emit('test.event', 'payload');

      expect(errorHandler).toHaveBeenCalledTimes(1);
      expect(errorHandler.mock.calls[0]?.[0]).toBeInstanceOf(Error);
    });
  });

  describe('maxListeners warning', () => {
    test('should warn when exceeding maxListeners', () => {
      const consoleSpy = mock(() => {});
      const originalWarn = console.warn;
      console.warn = consoleSpy;

      const emitterWithLimit = new EventEmitterService({ maxListeners: 2 });

      emitterWithLimit.on('test.event', () => {});
      emitterWithLimit.on('test.event', () => {});
      emitterWithLimit.on('test.event', () => {}); // 超过限制

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleSpy.mock.calls[0]?.[0]).toContain('Max listeners');

      console.warn = originalWarn;
    });
  });

  describe('globalPrefix', () => {
    test('should add global prefix to event names', () => {
      const emitterWithPrefix = new EventEmitterService({
        globalPrefix: 'app',
      });
      const listener = mock(() => {});

      emitterWithPrefix.on('user.created', listener);
      emitterWithPrefix.emit('user.created', 'payload');

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });
});

describe('EventEmitterService wildcard', () => {
  let emitter: EventEmitter;

  beforeEach(() => {
    emitter = new EventEmitterService({ wildcard: true });
  });

  describe('single wildcard (*)', () => {
    test('should match single segment', () => {
      const listener = mock(() => {});
      emitter.on('user.*', listener);

      emitter.emit('user.created', 'payload1');
      emitter.emit('user.updated', 'payload2');

      expect(listener).toHaveBeenCalledTimes(2);
    });

    test('should not match multiple segments', () => {
      const listener = mock(() => {});
      emitter.on('user.*', listener);

      emitter.emit('user.profile.updated', 'payload');

      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('double wildcard (**)', () => {
    test('should match any number of segments', () => {
      const listener = mock(() => {});
      emitter.on('user.**', listener);

      emitter.emit('user.created', 'payload1');
      emitter.emit('user.profile.updated', 'payload2');
      emitter.emit('user.settings.privacy.changed', 'payload3');

      expect(listener).toHaveBeenCalledTimes(3);
    });

    test('should match at end of pattern', () => {
      const listener = mock(() => {});
      emitter.on('app.**', listener);

      emitter.emit('app.start', 'payload');

      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('mixed patterns', () => {
    test('should handle exact match alongside wildcards', () => {
      const exactListener = mock(() => {});
      const wildcardListener = mock(() => {});

      emitter.on('user.created', exactListener);
      emitter.on('user.*', wildcardListener);

      emitter.emit('user.created', 'payload');

      expect(exactListener).toHaveBeenCalledTimes(1);
      expect(wildcardListener).toHaveBeenCalledTimes(1);
    });
  });
});
