import 'reflect-metadata';
import { describe, expect, test, afterEach } from 'bun:test';
import { Test } from '../../src/testing/testing-module';
import { Injectable, Inject } from '../../src/di/decorators';
import { Controller } from '../../src/controller';
import { GET, POST } from '../../src/router/decorators';
import { Body } from '../../src/controller';
import type { TestHttpClient } from '../../src/testing/test-client';

const GREETER_TOKEN = Symbol('Greeter');

interface Greeter {
  greet(name: string): string;
}

@Injectable()
class RealGreeter implements Greeter {
  public greet(name: string): string {
    return `Hello, ${name}!`;
  }
}

@Controller('/api/test')
class TestController {
  public constructor(
    @Inject(GREETER_TOKEN) private readonly greeter: Greeter,
  ) {}

  @GET('/hello/:name')
  public hello(): string {
    return this.greeter.greet('World');
  }

  @GET('/ping')
  public ping(): object {
    return { pong: true };
  }

  @POST('/echo')
  public echo(@Body() body: unknown): unknown {
    return body;
  }
}

describe('TestingModule', () => {
  let client: TestHttpClient | undefined;

  afterEach(async () => {
    if (client) {
      await client.close();
      client = undefined;
    }
  });

  test('should create testing module and resolve providers', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: GREETER_TOKEN, useClass: RealGreeter },
      ],
    }).compile();

    const greeter = module.get<Greeter>(GREETER_TOKEN);
    expect(greeter.greet('Test')).toBe('Hello, Test!');
  });

  test('should override provider with useValue', async () => {
    const mockGreeter: Greeter = {
      greet: (name: string) => `Mock: ${name}`,
    };

    const module = await Test.createTestingModule({
      providers: [
        { provide: GREETER_TOKEN, useClass: RealGreeter },
      ],
    })
      .overrideProvider(GREETER_TOKEN)
      .useValue(mockGreeter)
      .compile();

    const greeter = module.get<Greeter>(GREETER_TOKEN);
    expect(greeter.greet('Test')).toBe('Mock: Test');
  });

  test('should create HTTP client and handle GET', async () => {
    const module = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        { provide: GREETER_TOKEN, useValue: { greet: () => 'test-response' } },
      ],
    }).compile();

    client = await module.createHttpClient();

    const res = await client.get('/api/test/ping');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ pong: true });
  });

  test('should create HTTP client and handle POST with body', async () => {
    const module = await Test.createTestingModule({
      controllers: [TestController],
      providers: [
        { provide: GREETER_TOKEN, useValue: { greet: () => 'ok' } },
      ],
    }).compile();

    client = await module.createHttpClient();

    const res = await client.post('/api/test/echo', {
      body: { message: 'hello' },
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'hello' });
  });

  test('should override provider with useFactory', async () => {
    const module = await Test.createTestingModule({
      providers: [
        { provide: GREETER_TOKEN, useClass: RealGreeter },
      ],
    })
      .overrideProvider(GREETER_TOKEN)
      .useFactory(() => ({ greet: (n: string) => `Factory: ${n}` }))
      .compile();

    const greeter = module.get<Greeter>(GREETER_TOKEN);
    expect(greeter.greet('X')).toBe('Factory: X');
  });
});
