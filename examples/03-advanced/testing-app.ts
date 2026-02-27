/**
 * Testing Module Example
 * Demonstrates how to use Test.createTestingModule() for unit/integration testing.
 * Run this directly: bun run examples/03-advanced/testing-app.ts
 */
import {
  Test,
  Injectable,
  Inject,
  Controller,
  GET,
} from '@dangao/bun-server';

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

@Controller('/api')
class GreetController {
  public constructor(
    @Inject(GREETER_TOKEN) private readonly greeter: Greeter,
  ) {}

  @GET('/greet')
  public greet(): object {
    return { message: this.greeter.greet('World') };
  }
}

// --- Demo: override provider with mock ---
async function demo(): Promise<void> {
  const mockGreeter: Greeter = { greet: (name: string) => `Mock: ${name}` };

  const module = await Test.createTestingModule({
    controllers: [GreetController],
    providers: [
      { provide: GREETER_TOKEN, useClass: RealGreeter },
    ],
  })
    .overrideProvider(GREETER_TOKEN)
    .useValue(mockGreeter)
    .compile();

  const client = await module.createHttpClient();

  const res = await client.get('/api/greet');
  console.log('Status:', res.status);
  console.log('Body:', res.body);
  // -> { message: "Mock: World" }

  await client.close();
  console.log('Testing Module example completed.');
}

await demo();
