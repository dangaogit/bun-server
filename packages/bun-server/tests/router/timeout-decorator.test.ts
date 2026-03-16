import { describe, expect, test } from 'bun:test';

import { Context } from '../../src/core/context';
import { Route } from '../../src/router/route';
import {
  IdleTimeout,
  getIdleTimeout,
} from '../../src/router/timeout-decorator';

describe('IdleTimeout decorator', () => {
  test('should get class level timeout', () => {
    @IdleTimeout(500)
    class Controller {
      public list(): void {}
    }
    expect(getIdleTimeout(Controller as any, 'list')).toBe(500);
  });

  test('should prefer method level timeout', () => {
    @IdleTimeout(500)
    class Controller {
      @IdleTimeout(100)
      public list(): void {}
    }
    expect(getIdleTimeout(Controller as any, 'list')).toBe(100);
  });
});

describe('Route timeout', () => {
  test('should throw 408 when route execution times out', async () => {
    const route = new Route(
      'GET',
      '/slow',
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 30));
        return new Response('ok');
      },
      [],
      undefined,
      undefined,
      5,
    );

    const context = new Context(new Request('http://localhost/slow'));
    await expect(route.execute(context)).rejects.toThrow('Request Timeout');
  });
});

