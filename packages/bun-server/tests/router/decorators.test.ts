import { afterEach, describe, expect, test } from 'bun:test';

import { Controller } from '../../src/controller/controller';
import { GET, POST } from '../../src/router/decorators';
import { getRouteMetadata } from '../../src/controller/metadata';
import { RouteRegistry } from '../../src/router/registry';
import { Context } from '../../src/core/context';

describe('Router Decorators', () => {
  afterEach(() => {
    RouteRegistry.getInstance().clear();
  });

  test('should record metadata for controller methods', () => {
    @Controller('/decorator')
    class DecoratedController {
      @GET('/list')
      public list() {
        return 'ok';
      }
    }

    const metadata = getRouteMetadata(DecoratedController.prototype);
    expect(metadata.length).toBe(1);
    expect(metadata[0]?.path).toBe('/list');
    expect(metadata[0]?.method).toBe('GET');
    expect(typeof metadata[0]?.handler).toBe('function');
  });

  test('should register handler immediately when not within controller', async () => {
    class PlainHandlers {
      @POST('/plain')
      public handler(context: Context) {
        return context.createResponse({ ok: true });
      }
    }

    const registry = RouteRegistry.getInstance();
    const router = registry.getRouter();
    const request = new Request('http://localhost/plain', { method: 'POST' });
    const context = new Context(request);
    const response = await router.handle(context);

    expect(response).toBeDefined();
    expect(await response?.json()).toEqual({ ok: true });
  });
});

