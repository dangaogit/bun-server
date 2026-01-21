import { describe, expect, test, beforeEach, afterEach } from 'bun:test';
import 'reflect-metadata';

import { EventModule } from '../../src/events/event-module';
import { EventEmitterService } from '../../src/events/service';
import { EVENT_EMITTER_TOKEN, EVENT_OPTIONS_TOKEN } from '../../src/events/types';
import { MODULE_METADATA_KEY } from '../../src/di/module';

describe('EventModule', () => {
  beforeEach(() => {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, EventModule);
  });

  describe('forRoot', () => {
    test('should create module with default options', () => {
      EventModule.forRoot();

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, EventModule);
      expect(metadata.providers).toBeDefined();
      expect(metadata.exports).toContain(EVENT_EMITTER_TOKEN);
    });

    test('should create module with custom options', () => {
      EventModule.forRoot({
        maxListeners: 50,
        async: true,
        errorHandler: (event, error) => {
          console.error(`Event ${event} error:`, error);
        },
      });

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, EventModule);
      expect(metadata.providers).toBeDefined();

      // Find options provider
      const optionsProvider = metadata.providers.find(
        (p: any) => p.provide === EVENT_OPTIONS_TOKEN,
      );
      expect(optionsProvider?.useValue?.maxListeners).toBe(50);
      expect(optionsProvider?.useValue?.async).toBe(true);
    });

    test('should export EventService', () => {
      EventModule.forRoot();

      const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, EventModule);
      expect(metadata.exports).toContain(EVENT_EMITTER_TOKEN);
    });
  });
});

describe('EventEmitterService', () => {
  let service: EventEmitterService;

  beforeEach(() => {
    service = new EventEmitterService({ maxListeners: 10 });
  });

  afterEach(() => {
    service.removeAllListeners();
  });

  describe('on', () => {
    test('should register listener', () => {
      const handler = () => {};
      service.on('test-event', handler);

      expect(service.listenerCount('test-event')).toBe(1);
    });

    test('should return unsubscribe function', () => {
      const handler = () => {};
      const unsubscribe = service.on('test-event', handler);

      expect(typeof unsubscribe).toBe('function');
      unsubscribe();
      expect(service.listenerCount('test-event')).toBe(0);
    });

    test('should support multiple listeners', () => {
      service.on('event', () => {});
      service.on('event', () => {});
      service.on('event', () => {});

      expect(service.listenerCount('event')).toBe(3);
    });
  });

  describe('once', () => {
    test('should register one-time listener', async () => {
      let callCount = 0;
      service.once('one-time', () => {
        callCount++;
      });

      await service.emit('one-time');
      await service.emit('one-time');

      expect(callCount).toBe(1);
    });
  });

  describe('emit', () => {
    test('should call listeners with payload', () => {
      let receivedData: any;
      service.on('data-event', (data) => {
        receivedData = data;
      });

      service.emit('data-event', { value: 42 });

      expect(receivedData).toEqual({ value: 42 });
    });

    test('should not throw when no listeners', () => {
      // emit returns void, not boolean
      expect(() => service.emit('no-listeners', null)).not.toThrow();
    });

    test('should call listener when registered', () => {
      let called = false;
      service.on('has-listeners', () => { called = true; });
      service.emit('has-listeners', null);
      expect(called).toBe(true);
    });

    test('should call multiple listeners in order', () => {
      const order: number[] = [];
      service.on('ordered', () => order.push(1));
      service.on('ordered', () => order.push(2));
      service.on('ordered', () => order.push(3));

      service.emit('ordered', null);

      expect(order).toEqual([1, 2, 3]);
    });
  });

  describe('off', () => {
    test('should remove specific listener', () => {
      const handler = () => {};
      service.on('removable', handler);
      service.off('removable', handler);

      expect(service.listenerCount('removable')).toBe(0);
    });

    test('should not affect other listeners', () => {
      const handler1 = () => {};
      const handler2 = () => {};

      service.on('event', handler1);
      service.on('event', handler2);
      service.off('event', handler1);

      expect(service.listenerCount('event')).toBe(1);
    });
  });

  describe('removeAllListeners', () => {
    test('should remove all listeners for event', () => {
      service.on('event', () => {});
      service.on('event', () => {});
      service.removeAllListeners('event');

      expect(service.listenerCount('event')).toBe(0);
    });

    test('should remove all listeners when no event specified', () => {
      service.on('event1', () => {});
      service.on('event2', () => {});
      service.removeAllListeners();

      expect(service.listenerCount('event1')).toBe(0);
      expect(service.listenerCount('event2')).toBe(0);
    });
  });

  describe('eventNames', () => {
    test('should return all event names', () => {
      service.on('event1', () => {});
      service.on('event2', () => {});
      service.on('event3', () => {});

      const names = service.eventNames();
      expect(names).toContain('event1');
      expect(names).toContain('event2');
      expect(names).toContain('event3');
    });
  });

  describe('getListeners', () => {
    test('should return listeners count via listenerCount', () => {
      const handler1 = () => {};
      const handler2 = () => {};

      service.on('event', handler1);
      service.on('event', handler2);

      // Use listenerCount method instead
      expect(service.listenerCount('event')).toBe(2);
    });
  });
});
