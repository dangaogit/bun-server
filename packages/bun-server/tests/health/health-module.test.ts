import { describe, expect, test } from 'bun:test';
import 'reflect-metadata';

import { MODULE_METADATA_KEY } from '../../src/di/module';
import {
  HealthController,
  HealthModule,
  HEALTH_INDICATORS_TOKEN,
  type HealthIndicator,
} from '../../src/health';

describe('HealthModule', () => {
  test('should register controller and providers', () => {
    const indicators: HealthIndicator[] = [
      {
        name: 'test',
        check() {
          return { status: 'up' };
        },
      },
    ];

    HealthModule.forRoot({ indicators });

    const metadata = Reflect.getMetadata(MODULE_METADATA_KEY, HealthModule);
    expect(metadata).toBeDefined();
    expect(metadata.controllers).toContain(HealthController);

    const indicatorProvider = metadata.providers.find(
      (provider: any) => provider.provide === HEALTH_INDICATORS_TOKEN,
    );
    expect(indicatorProvider).toBeDefined();
    expect(indicatorProvider.useValue).toBe(indicators);
  });
});

describe('HealthController', () => {
  test('should return up status when all indicators are up', async () => {
    const indicators: HealthIndicator[] = [
      {
        name: 'db',
        check() {
          return { status: 'up' };
        },
      },
      {
        name: 'cache',
        async check() {
          return { status: 'up' };
        },
      },
    ];

    const controller = new HealthController(indicators, {});
    const result = await controller.health();

    expect(result.status).toBe('up');
    expect(result.details.db.status).toBe('up');
    expect(result.details.cache.status).toBe('up');
  });

  test('should return down status when any indicator is down', async () => {
    const indicators: HealthIndicator[] = [
      {
        name: 'db',
        check() {
          return { status: 'up' };
        },
      },
      {
        name: 'cache',
        check() {
          return {
            status: 'down',
            details: { reason: 'unreachable' },
          };
        },
      },
    ];

    const controller = new HealthController(indicators, {});
    const result = await controller.ready();

    expect(result.status).toBe('down');
    expect(result.details.db.status).toBe('up');
    expect(result.details.cache.status).toBe('down');
  });

  test('should mark indicator as down when check throws error', async () => {
    const indicators: HealthIndicator[] = [
      {
        name: 'db',
        check() {
          throw new Error('connection failed');
        },
      },
    ];

    const controller = new HealthController(indicators, {});
    const result = await controller.health();

    expect(result.status).toBe('down');
    expect(result.details.db.status).toBe('down');
    expect(result.details.db.details?.error).toBe('connection failed');
  });

  test('should return up status when no indicators registered', async () => {
    const controller = new HealthController([], {});
    const result = await controller.health();

    expect(result.status).toBe('up');
    expect(Object.keys(result.details).length).toBe(0);
  });
});


