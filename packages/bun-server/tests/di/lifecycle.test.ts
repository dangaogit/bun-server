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
        public onModuleInit(): void {
          calls.push('onModuleInit');
        }
        public onModuleDestroy(): void {
          calls.push('onModuleDestroy');
        }
        public onApplicationBootstrap(): void {
          calls.push('onApplicationBootstrap');
        }
        public onApplicationShutdown(signal?: string): void {
          calls.push(`onApplicationShutdown:${signal ?? 'none'}`);
        }
      }

      @Controller('/test')
      class TestController {
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

      expect(calls).toContain('onModuleInit');
      expect(calls).toContain('onApplicationBootstrap');

      const initIdx = calls.indexOf('onModuleInit');
      const bootIdx = calls.indexOf('onApplicationBootstrap');
      expect(initIdx).toBeLessThan(bootIdx);

      await app.stop();

      expect(calls).toContain('onModuleDestroy');
      // onApplicationShutdown with no signal when using stop() directly
      const shutdownEntry = calls.find((c) => c.startsWith('onApplicationShutdown'));
      expect(shutdownEntry).toBeDefined();
    });
  });
});
