import { describe, expect, test } from 'bun:test';

import { ParamBinder } from '../../src/controller/param-binder';
import {
  QueryMap,
  HeaderMap,
  type QueryMapOptions,
  type HeaderMapOptions,
} from '../../src/controller/decorators';
import { Context } from '../../src/core/context';

class QueryMapController {
  public constructor(public readonly store: unknown[] = []) {}

  public async handle(@QueryMap() query: Record<string, string | string[]>) {
    this.store.push(query);
    return query;
  }

  public async handleTransformed(
    @QueryMap<{ name: string; age: number }>((input) => ({
      name: (input.name as string) ?? '',
      age: Number((input.age as string) ?? '0'),
    }))
    query: { name: string; age: number },
  ) {
    this.store.push(query);
    return query;
  }

  public async handleValidated(
    @QueryMap<{ foo: string }>(
      ((input) => ({ foo: input.foo as string })) as QueryMapOptions<{ foo: string }>['transform'],
    )
    query: { foo: string },
  ) {
    if (!query.foo) {
      throw new Error('validation failed');
    }
    this.store.push(query);
    return query;
  }
}

class HeaderMapController {
  public constructor(public readonly store: unknown[] = []) {}

  public async handle(
    @HeaderMap() headers: Record<string, string | string[]>,
  ) {
    this.store.push(headers);
    return headers;
  }

  public async handlePicked(
    @HeaderMap({
      normalize: true,
      pick: ['x-custom', 'x-list'],
    })
    headers: Record<string, string | string[]>,
  ) {
    this.store.push(headers);
    return headers;
  }

  public async handleTransformed(
    @HeaderMap<{ token: string }>((input) => ({
      token: (input.authorization as string) ?? '',
    }))
    headers: { token: string },
  ) {
    this.store.push(headers);
    return headers;
  }
}

function createContext(url: string, init?: RequestInit) {
  return new Context(new Request(url, init));
}

describe('ParamBinder QueryMap', () => {
  test('should aggregate query params into map with arrays', async () => {
    const controller = new QueryMapController();
    const ctx = createContext('http://localhost/api?q=1&q=2&name=alice');
    const params = await ParamBinder.bind(
      controller,
      'handle',
      ctx,
    );
    expect(params[0]).toEqual({ q: ['1', '2'], name: 'alice' });
  });

  test('should transform query map', async () => {
    const controller = new QueryMapController();
    const ctx = createContext('http://localhost/api?name=alice&age=20');
    const params = await ParamBinder.bind(
      controller,
      'handleTransformed',
      ctx,
    );
    expect(params[0]).toEqual({ name: 'alice', age: 20 });
  });

  test('should validate query map via user code', async () => {
    const controller = new QueryMapController();
    const ctx = createContext('http://localhost/api?foo=bar');
    const params = await ParamBinder.bind(
      controller,
      'handleValidated',
      ctx,
    );
    expect(params[0]).toEqual({ foo: 'bar' });
  });
});

describe('ParamBinder HeaderMap', () => {
  test('should aggregate headers into map with optional array', async () => {
    const controller = new HeaderMapController();
    const ctx = createContext('http://localhost/api', {
      headers: {
        'X-Token': 'abc',
        'X-List': 'a, b',
      },
    });
    const params = await ParamBinder.bind(
      controller,
      'handle',
      ctx,
    );
    expect(params[0]).toMatchObject({
      'x-token': 'abc',
      'x-list': ['a', 'b'],
    });
  });

  test('should pick and normalize headers', async () => {
    const controller = new HeaderMapController();
    const ctx = createContext('http://localhost/api', {
      headers: {
        'X-Custom': 'val',
        'X-List': 'a, b',
        'Other': 'ignore',
      },
    });
    const params = await ParamBinder.bind(
      controller,
      'handlePicked',
      ctx,
    );
    expect(params[0]).toEqual({
      'x-custom': 'val',
      'x-list': ['a', 'b'],
    });
  });

  test('should pick headers with case-insensitive pick when normalize=true (default)', async () => {
    const controller = new HeaderMapController();
    const ctx = createContext('http://localhost/api', {
      headers: {
        'X-CUSTOM': 'val',
        'X-LIST': 'a, b',
        'Other': 'ignore',
      },
    });
    const params = await ParamBinder.bind(
      controller,
      'handlePicked',
      ctx,
    );
    expect(params[0]).toEqual({
      'x-custom': 'val',
      'x-list': ['a', 'b'],
    });
  });

  test('should transform headers', async () => {
    const controller = new HeaderMapController();
    const ctx = createContext('http://localhost/api', {
      headers: {
        Authorization: 'Bearer token123',
      },
    });
    const params = await ParamBinder.bind(
      controller,
      'handleTransformed',
      ctx,
    );
    expect(params[0]).toEqual({ token: 'Bearer token123' });
  });
});


