import { Module, MODULE_METADATA_KEY } from '../di/module';
import type { ModuleProvider } from '../di/module';
import { PromptService } from './service';
import {
  PROMPT_SERVICE_TOKEN,
  PROMPT_OPTIONS_TOKEN,
  type PromptModuleOptions,
} from './types';
import { InMemoryPromptStore } from './stores/memory-store';

@Module({ providers: [] })
export class PromptModule {
  /**
   * Configure the prompt module.
   *
   * @example
   * ```typescript
   * // With in-memory store (default):
   * PromptModule.forRoot({});
   *
   * // With file store:
   * PromptModule.forRoot({
   *   store: new FilePromptStore({ promptsDir: './.prompts' }),
   * });
   * ```
   */
  public static forRoot(options: PromptModuleOptions = {}): typeof PromptModule {
    const resolvedOptions: PromptModuleOptions = {
      ...options,
      store: options.store ?? new InMemoryPromptStore(),
    };

    const service = new PromptService(resolvedOptions as Required<PromptModuleOptions>);

    const providers: ModuleProvider[] = [
      { provide: PROMPT_OPTIONS_TOKEN, useValue: resolvedOptions },
      { provide: PROMPT_SERVICE_TOKEN, useValue: service },
      PromptService,
    ];

    const existing = Reflect.getMetadata(MODULE_METADATA_KEY, PromptModule) || {};
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      ...existing,
      providers: [...(existing.providers || []), ...providers],
      exports: [
        ...(existing.exports || []),
        PROMPT_SERVICE_TOKEN,
        PromptService,
      ],
    }, PromptModule);

    return PromptModule;
  }

  /**
   * Reset module state (for testing)
   */
  public static reset(): void {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, PromptModule);
  }
}
