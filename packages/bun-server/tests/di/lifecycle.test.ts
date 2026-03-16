import 'reflect-metadata';
import { describe, expect, test, beforeEach } from 'bun:test';
import { Application } from '../../src/core/application';
import { Module } from '../../src/di/module';
import { Injectable, Inject } from '../../src/di/decorators';
import { Controller } from '../../src/controller';
import { GET } from '../../src/router/decorators';
import type {
  OnModuleInit,
  OnModuleDestroy,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '../../src/di/lifecycle';
import {
  callOnModuleInit,
  callOnModuleDestroy,
  callOnApplicationBootstrap,
  callOnApplicationShutdown,
  callComponentBeforeCreate,
  callOnAfterCreate,
  callOnBeforeDestroy,
  callOnAfterDestroy,
} from '../../src/di/lifecycle';

describe('Lifecycle Hooks', () => {
  describe('type guards and runners', () => {
    test('callOnModuleInit should invoke onModuleInit', async () => {
      const calls: string[] = [];
      const instances = [
        { onModuleInit: () => { calls.push('a'); } },
        { onModuleInit: async () => { calls.push('b'); } },
        { notAHook: true },
      ];

      await callOnModuleInit(instances);
      expect(calls).toEqual(['a', 'b']);
    });

    test('callOnModuleDestroy should invoke in reverse order', async () => {
      const calls: string[] = [];
      const instances = [
        { onModuleDestroy: () => { calls.push('first'); } },
        { onModuleDestroy: () => { calls.push('second'); } },
        { onModuleDestroy: () => { calls.push('third'); } },
      ];

      await callOnModuleDestroy(instances);
      expect(calls).toEqual(['third', 'second', 'first']);
    });

    test('callOnApplicationBootstrap should invoke onApplicationBootstrap', async () => {
      const calls: string[] = [];
      const instances = [
        { onApplicationBootstrap: () => { calls.push('boot'); } },
      ];

      await callOnApplicationBootstrap(instances);
      expect(calls).toEqual(['boot']);
    });

    test('callOnApplicationShutdown should pass signal and call in reverse', async () => {
      const calls: Array<{ name: string; signal?: string }> = [];
      const instances = [
        { onApplicationShutdown: (signal?: string) => { calls.push({ name: 'a', signal }); } },
        { onApplicationShutdown: (signal?: string) => { calls.push({ name: 'b', signal }); } },
      ];

      await callOnApplicationShutdown(instances, 'SIGTERM');
      expect(calls).toEqual([
        { name: 'b', signal: 'SIGTERM' },
        { name: 'a', signal: 'SIGTERM' },
      ]);
    });

    test('callComponentBeforeCreate and callOnAfterCreate should invoke component creation hooks', () => {
      const calls: string[] = [];
      class TestComponent {
        public static onBeforeCreate(): void {
          calls.push('beforeCreate');
        }
        public onAfterCreate(): void {
          calls.push('afterCreate');
        }
      }

      callComponentBeforeCreate(TestComponent);
      callOnAfterCreate(new TestComponent());
      expect(calls).toEqual(['beforeCreate', 'afterCreate']);
    });

    test('callOnBeforeDestroy and callOnAfterDestroy should invoke in reverse order', async () => {
      const calls: string[] = [];
      const instances = [
        {
          onBeforeDestroy: () => {
            calls.push('before:first');
          },
          onAfterDestroy: () => {
            calls.push('after:first');
          },
        },
        {
          onBeforeDestroy: () => {
            calls.push('before:second');
          },
          onAfterDestroy: () => {
            calls.push('after:second');
          },
        },
      ];

      await callOnBeforeDestroy(instances);
      await callOnAfterDestroy(instances);

      expect(calls).toEqual([
        'before:second',
        'before:first',
        'after:second',
        'after:first',
      ]);
    });

    test('should skip non-hook instances', async () => {
      const calls: string[] = [];
      const instances = [
        null,
        undefined,
        42,
        'string',
        { someOther: true },
        { onModuleInit: () => { calls.push('ok'); } },
      ];

      await callOnModuleInit(instances as unknown[]);
      expect(calls).toEqual(['ok']);
    });
  });

  describe('integration with Application', () => {
    test('should call lifecycle hooks during start and stop', async () => {
      const calls: string[] = [];

      @Injectable()
      class LifecycleService implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap, OnApplicationShutdown {
        public static onBeforeCreate(): void {
          calls.push('service:onBeforeCreate');
        }
        public onAfterCreate(): void {
          calls.push('service:onAfterCreate');
        }
        public onBeforeDestroy(): void {
          calls.push('service:onBeforeDestroy');
        }
        public onModuleInit(): void {
          calls.push('onModuleInit');
        }
        public onModuleDestroy(): void {
          calls.push('onModuleDestroy');
        }
        public onAfterDestroy(): void {
          calls.push('service:onAfterDestroy');
        }
        public onApplicationBootstrap(): void {
          calls.push('onApplicationBootstrap');
        }
        public onApplicationShutdown(signal?: string): void {
          calls.push(`onApplicationShutdown:${signal ?? 'none'}`);
        }
      }

      @Controller('/test')
      class TestController implements OnModuleInit, OnModuleDestroy, OnApplicationBootstrap, OnApplicationShutdown {
        public static onBeforeCreate(): void {
          calls.push('controller:onBeforeCreate');
        }
        public onAfterCreate(): void {
          calls.push('controller:onAfterCreate');
        }
        public onBeforeDestroy(): void {
          calls.push('controller:onBeforeDestroy');
        }
        public onModuleInit(): void {
          calls.push('controller:onModuleInit');
        }
        public onModuleDestroy(): void {
          calls.push('controller:onModuleDestroy');
        }
        public onAfterDestroy(): void {
          calls.push('controller:onAfterDestroy');
        }
        public onApplicationBootstrap(): void {
          calls.push('controller:onApplicationBootstrap');
        }
        public onApplicationShutdown(signal?: string): void {
          calls.push(`controller:onApplicationShutdown:${signal ?? 'none'}`);
        }
        @GET('/')
        public get(): string {
          return 'ok';
        }
      }

      @Module({
        controllers: [TestController],
        providers: [LifecycleService],
      })
      class TestModule {}

      const app = new Application({ port: 0, enableSignalHandlers: false });
      app.registerModule(TestModule);
      await app.listen(0);

      expect(calls).toContain('service:onBeforeCreate');
      expect(calls).toContain('service:onAfterCreate');
      expect(calls).toContain('controller:onBeforeCreate');
      expect(calls).toContain('controller:onAfterCreate');
      expect(calls).toContain('onModuleInit');
      expect(calls).toContain('onApplicationBootstrap');
      expect(calls).toContain('controller:onModuleInit');
      expect(calls).toContain('controller:onApplicationBootstrap');

      const initIdx = calls.indexOf('onModuleInit');
      const bootIdx = calls.indexOf('onApplicationBootstrap');
      expect(initIdx).toBeLessThan(bootIdx);

      await app.stop();

      expect(calls).toContain('service:onBeforeDestroy');
      expect(calls).toContain('onModuleDestroy');
      expect(calls).toContain('service:onAfterDestroy');
      expect(calls).toContain('controller:onBeforeDestroy');
      expect(calls).toContain('controller:onModuleDestroy');
      expect(calls).toContain('controller:onAfterDestroy');
      // onApplicationShutdown with no signal when using stop() directly
      const shutdownEntry = calls.find((c) => c.startsWith('onApplicationShutdown'));
      expect(shutdownEntry).toBeDefined();
      const controllerShutdownEntry = calls.find((c) => c.startsWith('controller:onApplicationShutdown'));
      expect(controllerShutdownEntry).toBeDefined();
    });

    test('should call onModuleInit once for duplicated provider instance', async () => {
      const calls: string[] = [];

      @Injectable()
      class SharedService implements OnModuleInit {
        public onModuleInit(): void {
          calls.push('init');
        }
      }

      const shared = new SharedService();

      @Controller('/dup')
      class DupController {
        @GET('/')
        public get(): string {
          return 'ok';
        }
      }

      @Module({
        controllers: [DupController],
        providers: [
          { provide: SharedService, useValue: shared },
          { provide: Symbol.for('dup-shared'), useValue: shared },
        ],
      })
      class DupModule {}

      const app = new Application({ port: 0, enableSignalHandlers: false });
      app.registerModule(DupModule);
      await app.listen(0);
      await app.stop();

      expect(calls.length).toBe(1);
    });
  });
});
