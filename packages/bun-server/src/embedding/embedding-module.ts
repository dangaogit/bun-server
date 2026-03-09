import { Module, MODULE_METADATA_KEY } from '../di/module';
import type { ModuleProvider } from '../di/module';
import { EmbeddingService } from './service';
import {
  EMBEDDING_SERVICE_TOKEN,
  EMBEDDING_OPTIONS_TOKEN,
  type EmbeddingModuleOptions,
} from './types';

@Module({ providers: [] })
export class EmbeddingModule {
  /**
   * Configure the embedding module.
   *
   * @example
   * ```typescript
   * EmbeddingModule.forRoot({
   *   provider: {
   *     name: 'openai',
   *     provider: OpenAIEmbeddingProvider,
   *     config: { apiKey: process.env.OPENAI_API_KEY! },
   *   },
   * });
   * ```
   */
  public static forRoot(options: EmbeddingModuleOptions): typeof EmbeddingModule {
    const service = new EmbeddingService(options);

    const providers: ModuleProvider[] = [
      { provide: EMBEDDING_OPTIONS_TOKEN, useValue: options },
      { provide: EMBEDDING_SERVICE_TOKEN, useValue: service },
      EmbeddingService,
    ];

    const existing = Reflect.getMetadata(MODULE_METADATA_KEY, EmbeddingModule) || {};
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      ...existing,
      providers: [...(existing.providers || []), ...providers],
      exports: [
        ...(existing.exports || []),
        EMBEDDING_SERVICE_TOKEN,
        EmbeddingService,
      ],
    }, EmbeddingModule);

    return EmbeddingModule;
  }

  public static reset(): void {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, EmbeddingModule);
  }
}
