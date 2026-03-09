import { Module, MODULE_METADATA_KEY } from '../di/module';
import type { ModuleProvider } from '../di/module';
import { AiGuardService } from './service';
import {
  AI_GUARD_SERVICE_TOKEN,
  AI_GUARD_OPTIONS_TOKEN,
  type AiGuardModuleOptions,
} from './types';

@Module({ providers: [] })
export class AiGuardModule {
  /**
   * Configure AI safety guards.
   *
   * @example
   * ```typescript
   * AiGuardModule.forRoot({
   *   piiDetection: true,
   *   moderation: { openaiApiKey: process.env.OPENAI_API_KEY },
   *   promptInjection: { sensitivity: 'medium' },
   * });
   * ```
   */
  public static forRoot(options: AiGuardModuleOptions = {}): typeof AiGuardModule {
    const service = new AiGuardService(options);

    const providers: ModuleProvider[] = [
      { provide: AI_GUARD_OPTIONS_TOKEN, useValue: options },
      { provide: AI_GUARD_SERVICE_TOKEN, useValue: service },
      AiGuardService,
    ];

    const existing = Reflect.getMetadata(MODULE_METADATA_KEY, AiGuardModule) || {};
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      ...existing,
      providers: [...(existing.providers || []), ...providers],
      exports: [
        ...(existing.exports || []),
        AI_GUARD_SERVICE_TOKEN,
        AiGuardService,
      ],
    }, AiGuardModule);

    return AiGuardModule;
  }

  public static reset(): void {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, AiGuardModule);
  }
}
