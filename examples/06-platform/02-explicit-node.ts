/**
 * Explicit Node.js Platform Example
 *
 * Demonstrates explicitly selecting the Node.js platform adapter via the
 * bootstrap `platform` option. This is the highest-priority configuration
 * method — it overrides CLI args, environment variables, and auto-detection.
 *
 * Run on Bun with Node.js adapter:  bun 06-platform/02-explicit-node.ts
 * Run on Node.js:                   node dist/06-platform/02-explicit-node.js
 *
 * Use cases:
 *   - Testing Node.js adapter behaviour on a Bun machine
 *   - Ensuring consistent adapter across CI environments
 *   - Migrating gradually from Bun to Node.js or vice-versa
 */

import {
  Application,
  Controller,
  GET,
  POST,
  Body,
  Module,
  Injectable,
} from '@dangao/bun-server';
import { getRuntime } from '@dangao/bun-server';

@Injectable()
class CryptoService {
  public hash(input: string): string {
    const hasher = getRuntime().crypto.createHasher('sha256');
    hasher.update(input);
    return hasher.digest('hex');
  }
}

@Controller('/demo')
class DemoController {
  public constructor(private readonly crypto: CryptoService) {}

  @GET('/platform')
  public platform() {
    return {
      engine: getRuntime().engine,
      note: 'Explicitly set to node via ApplicationOptions.platform',
    };
  }

  @POST('/hash')
  public hash(@Body() body: { text: string }) {
    return {
      input: body.text,
      sha256: this.crypto.hash(body.text),
      hashedBy: getRuntime().engine === 'bun' ? 'Bun.CryptoHasher' : 'node:crypto',
    };
  }
}

@Module({
  controllers: [DemoController],
  providers: [CryptoService],
})
class AppModule {}

// ─── Explicit platform selection ───────────────────────────────────────────
const app = new Application({
  port: 3001,
  platform: 'node', // Force NodePlatform regardless of actual runtime
});
// ───────────────────────────────────────────────────────────────────────────

app.registerModule(AppModule);
await app.listen();

console.log(`Server running on http://localhost:3001`);
console.log(`Active platform: ${getRuntime().engine} (explicitly set to 'node')`);
console.log(`GET  http://localhost:3001/demo/platform`);
console.log(`POST http://localhost:3001/demo/hash  body: { "text": "hello world" }`);
