import { describe, expect, test, beforeEach } from 'bun:test';
import 'reflect-metadata';
import {
  OnEvent,
  getOnEventMetadata,
  isEventListenerClass,
} from '../../src/events/decorators';
import { Injectable } from '../../src/di/decorators';
import {
  ON_EVENT_METADATA_KEY,
  EVENT_LISTENER_CLASS_METADATA_KEY,
} from '../../src/events/types';

describe('OnEvent decorator', () => {
  beforeEach(() => {
    // 清理可能的元数据污染
  });

  test('should mark class as event listener class', () => {
    @Injectable()
    class TestService {
      @OnEvent('test.event')
      public handleEvent(payload: unknown): void {
        // handler
      }
    }

    expect(isEventListenerClass(TestService)).toBe(true);
  });

  test('should store event metadata on class', () => {
    @Injectable()
    class TestService {
      @OnEvent('user.created')
      public handleUserCreated(payload: unknown): void {
        // handler
      }
    }

    const metadata = getOnEventMetadata(TestService);
    expect(metadata).toBeDefined();
    expect(metadata?.length).toBe(1);
    expect(metadata?.[0]?.event).toBe('user.created');
    expect(metadata?.[0]?.methodName).toBe('handleUserCreated');
  });

  test('should support Symbol as event name', () => {
    const USER_DELETED = Symbol('user.deleted');

    @Injectable()
    class TestService {
      @OnEvent(USER_DELETED)
      public handleUserDeleted(payload: unknown): void {
        // handler
      }
    }

    const metadata = getOnEventMetadata(TestService);
    expect(metadata?.[0]?.event).toBe(USER_DELETED);
  });

  test('should support multiple event listeners in same class', () => {
    @Injectable()
    class TestService {
      @OnEvent('event1')
      public handleEvent1(payload: unknown): void {}

      @OnEvent('event2')
      public handleEvent2(payload: unknown): void {}

      @OnEvent('event3')
      public handleEvent3(payload: unknown): void {}
    }

    const metadata = getOnEventMetadata(TestService);
    expect(metadata?.length).toBe(3);

    const events = metadata?.map((m) => m.event);
    expect(events).toContain('event1');
    expect(events).toContain('event2');
    expect(events).toContain('event3');
  });

  test('should use default options when not specified', () => {
    @Injectable()
    class TestService {
      @OnEvent('test.event')
      public handleEvent(payload: unknown): void {}
    }

    const metadata = getOnEventMetadata(TestService);
    expect(metadata?.[0]?.async).toBe(false);
    expect(metadata?.[0]?.priority).toBe(0);
  });

  test('should support async option', () => {
    @Injectable()
    class TestService {
      @OnEvent('test.event', { async: true })
      public handleEvent(payload: unknown): void {}
    }

    const metadata = getOnEventMetadata(TestService);
    expect(metadata?.[0]?.async).toBe(true);
  });

  test('should support priority option', () => {
    @Injectable()
    class TestService {
      @OnEvent('test.event', { priority: 10 })
      public handleEvent(payload: unknown): void {}
    }

    const metadata = getOnEventMetadata(TestService);
    expect(metadata?.[0]?.priority).toBe(10);
  });

  test('should support both async and priority options', () => {
    @Injectable()
    class TestService {
      @OnEvent('test.event', { async: true, priority: 5 })
      public handleEvent(payload: unknown): void {}
    }

    const metadata = getOnEventMetadata(TestService);
    expect(metadata?.[0]?.async).toBe(true);
    expect(metadata?.[0]?.priority).toBe(5);
  });

  test('should not mark class without @OnEvent as listener class', () => {
    @Injectable()
    class RegularService {
      public doSomething(): void {}
    }

    expect(isEventListenerClass(RegularService)).toBe(false);
  });

  test('should return undefined for class without @OnEvent', () => {
    @Injectable()
    class RegularService {
      public doSomething(): void {}
    }

    const metadata = getOnEventMetadata(RegularService);
    expect(metadata).toBeUndefined();
  });
});

describe('Event metadata isolation', () => {
  test('should isolate metadata between different classes', () => {
    @Injectable()
    class ServiceA {
      @OnEvent('event.a')
      public handleA(payload: unknown): void {}
    }

    @Injectable()
    class ServiceB {
      @OnEvent('event.b')
      public handleB(payload: unknown): void {}
    }

    const metadataA = getOnEventMetadata(ServiceA);
    const metadataB = getOnEventMetadata(ServiceB);

    expect(metadataA?.length).toBe(1);
    expect(metadataA?.[0]?.event).toBe('event.a');

    expect(metadataB?.length).toBe(1);
    expect(metadataB?.[0]?.event).toBe('event.b');
  });
});
