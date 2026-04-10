/**
 * Platform Auto-Detection Example
 *
 * Demonstrates the default behavior: the framework automatically detects
 * whether it is running on Bun or Node.js and selects the appropriate
 * platform adapter at startup — no explicit configuration needed.
 *
 * Run on Bun:   bun 06-platform/01-auto-detect.ts
 * Run on Node:  node dist/06-platform/01-auto-detect.js
 */

import {
  Application,
  Controller,
  GET,
  Module,
  Injectable,
} from '@dangao/bun-server';
import { getRuntime } from '@dangao/bun-server';

@Injectable()
class PlatformInfoService {
  public getInfo() {
    const runtime = getRuntime();
    return {
      engine: runtime.engine,
      message: `Running on ${runtime.engine === 'bun' ? 'Bun' : 'Node.js'} platform`,
      adapters: {
        http: runtime.engine === 'bun' ? 'Bun.serve' : 'node:http',
        fs: runtime.engine === 'bun' ? 'Bun.file / Bun.write' : 'node:fs',
        crypto: runtime.engine === 'bun' ? 'Bun.CryptoHasher' : 'node:crypto',
        parser: runtime.engine === 'bun' ? 'Bun.JSONC / Bun.markdown' : 'jsonc-parser / marked',
        websocket: runtime.engine === 'bun' ? 'Bun.ServerWebSocket' : 'ws package',
      },
    };
  }
}

@Controller('/platform')
class PlatformController {
  public constructor(private readonly platform: PlatformInfoService) {}

  @GET('/info')
  public info() {
    return this.platform.getInfo();
  }

  @GET('/health')
  public health() {
    return { status: 'ok', engine: getRuntime().engine };
  }
}

@Module({
  controllers: [PlatformController],
  providers: [PlatformInfoService],
})
class AppModule {}

const app = new Application({ port: 3000 });
// No platform config — auto-detected from the running environment
app.registerModule(AppModule);

await app.listen();
console.log(`Server running on http://localhost:3000`);
console.log(`Detected platform: ${getRuntime().engine}`);
console.log(`GET http://localhost:3000/platform/info`);
