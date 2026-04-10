/**
 * CLI / Environment Variable Platform Switch Example
 *
 * Demonstrates the lower-priority platform selection methods:
 *   - CLI argument:    bun 06-platform/03-cli-switch.ts --platform=node
 *   - Env variable:   BUN_SERVER_PLATFORM=node bun 06-platform/03-cli-switch.ts
 *
 * Priority chain (highest → lowest):
 *   1. ApplicationOptions.platform  (code)
 *   2. --platform=<engine>          (CLI arg)
 *   3. BUN_SERVER_PLATFORM=<engine> (env var)
 *   4. auto-detect                  (default)
 *
 * Run examples:
 *   bun 06-platform/03-cli-switch.ts
 *   bun 06-platform/03-cli-switch.ts --platform=node
 *   BUN_SERVER_PLATFORM=node bun 06-platform/03-cli-switch.ts
 */

import {
  Application,
  Controller,
  GET,
  Module,
} from '@dangao/bun-server';
import { getRuntime } from '@dangao/bun-server';

@Controller('/info')
class InfoController {
  @GET('/')
  public index() {
    const runtime = getRuntime();
    return {
      engine: runtime.engine,
      detectionSources: {
        cliArg: process.argv.find((a) => a.startsWith('--platform=')) ?? null,
        envVar: process.env['BUN_SERVER_PLATFORM'] ?? null,
        autoDetect: typeof globalThis.Bun !== 'undefined' ? 'bun' : 'node',
      },
      resolvedTo: runtime.engine,
      message: `Platform resolved to: ${runtime.engine}`,
    };
  }

  @GET('/native')
  public native() {
    // Access the raw underlying server (not recommended, type is unknown)
    const app = new Application({ port: 0 });
    const nativeServer = app.getNativeServer();
    return {
      hasNativeServer: nativeServer != null,
      note: 'getNativeServer() returns the raw Bun.Server or node:http.Server instance',
    };
  }
}

@Module({ controllers: [InfoController] })
class AppModule {}

// No platform option here — resolved from CLI arg or env var at runtime
const app = new Application({ port: 3002 });
app.registerModule(AppModule);
await app.listen();

const engine = getRuntime().engine;
const source = process.argv.find((a) => a.startsWith('--platform='))
  ? 'CLI arg'
  : process.env['BUN_SERVER_PLATFORM']
    ? 'env var'
    : 'auto-detect';

console.log(`Server running on http://localhost:3002`);
console.log(`Platform: ${engine} (resolved via ${source})`);
console.log(`GET http://localhost:3002/info`);
