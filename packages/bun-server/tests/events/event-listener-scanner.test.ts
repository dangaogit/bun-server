import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';

import { EventListenerScanner, EVENT_LISTENER_SCANNER_TOKEN } from '../../src/events/event-module';
import { EventEmitterService } from '../../src/events/service';
import { OnEvent } from '../../src/events/decorators';
import { EVENT_LISTENER_CLASS_METADATA_KEY } from '../../src/events/types';
import { Container } from '../../src/di/container';
import { Injectable } from '../../src/di/decorators';

describe('EventListenerScanner', () => {
  let emitter: EventEmitterService;
  let container: Container;
  let scanner: EventListenerScanner;

  beforeEach(() => {
    emitter = new EventEmitterService();
    container = new Container();
    scanner = new EventListenerScanner(emitter, container);
  });

  describe('scanAndRegister', () => {
    test('should register listeners from class with OnEvent decorator', () => {
      @Injectable()
      class TestListener {
        public receivedPayload: any = null;

        @OnEvent('test-event')
        public handleTestEvent(payload: any): void {
          this.receivedPayload = payload;
        }
      }

      // Mark as event listener class
      Reflect.defineMetadata(EVENT_LISTENER_CLASS_METADATA_KEY, true, TestListener);

      container.register(TestListener);
      scanner.scanAndRegister([TestListener]);

      expect(emitter.listenerCount('test-event')).toBe(1);
    });

    test('should skip non-listener classes', () => {
      class NotAListener {
        public someMethod(): void {}
      }

      scanner.scanAndRegister([NotAListener]);

      // No listeners registered
      expect(emitter.listenerCount('some-event')).toBe(0);
    });

    test('should handle multiple listeners', () => {
      @Injectable()
      class MultiListener {
        @OnEvent('event1')
        public handleEvent1(): void {}

        @OnEvent('event2')
        public handleEvent2(): void {}
      }

      Reflect.defineMetadata(EVENT_LISTENER_CLASS_METADATA_KEY, true, MultiListener);

      container.register(MultiListener);
      scanner.scanAndRegister([MultiListener]);

      expect(emitter.listenerCount('event1')).toBe(1);
      expect(emitter.listenerCount('event2')).toBe(1);
    });
  });

  describe('registerListenerClass', () => {
    test('should register single listener class', () => {
      @Injectable()
      class SingleListener {
        @OnEvent('single-event')
        public handle(): void {}
      }

      Reflect.defineMetadata(EVENT_LISTENER_CLASS_METADATA_KEY, true, SingleListener);
      container.register(SingleListener);

      scanner.registerListenerClass(SingleListener);

      expect(emitter.listenerCount('single-event')).toBe(1);
    });

    test('should skip class without metadata', () => {
      class NoMetadata {
        public handle(): void {}
      }

      scanner.registerListenerClass(NoMetadata);

      expect(emitter.eventNames().length).toBe(0);
    });

    test('should handle class not registered in container', () => {
      @Injectable()
      class UnregisteredListener {
        @OnEvent('unreg-event')
        public handle(): void {}
      }

      Reflect.defineMetadata(EVENT_LISTENER_CLASS_METADATA_KEY, true, UnregisteredListener);
      // Not registering in container

      // Should not throw, just warn
      expect(() => scanner.registerListenerClass(UnregisteredListener)).not.toThrow();
    });
  });
});
