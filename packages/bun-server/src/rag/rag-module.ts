import { Module, MODULE_METADATA_KEY } from '../di/module';
import type { ModuleProvider } from '../di/module';
import type { Container } from '../di/container';
import { RagService } from './service';
import { RAG_SERVICE_TOKEN, RAG_OPTIONS_TOKEN, type RagModuleOptions } from './types';
import { EMBEDDING_SERVICE_TOKEN } from '../embedding/types';
import { VECTOR_STORE_TOKEN } from '../vector-store/types';
import { EmbeddingModule } from '../embedding/embedding-module';
import { VectorStoreModule } from '../vector-store/vector-store-module';

@Module({
  imports: [EmbeddingModule, VectorStoreModule],
  providers: [],
})
export class RagModule {
  /**
   * Configure the RAG module.
   *
   * **Requires** `EmbeddingModule` and `VectorStoreModule` to be imported first.
   *
   * @example
   * ```typescript
   * EmbeddingModule.forRoot({ provider: { ... } });
   * VectorStoreModule.forRoot({});
   * RagModule.forRoot({ collection: 'docs', chunkSize: 512, topK: 5 });
   *
   * \@Module({
   *   imports: [EmbeddingModule, VectorStoreModule, RagModule],
   * })
   * class AppModule {}
   * ```
   */
  public static forRoot(options: RagModuleOptions = {}): typeof RagModule {
    const resolvedOptions: RagModuleOptions = {
      collection: 'rag',
      chunkSize: 512,
      chunkOverlap: 50,
      topK: 5,
      minScore: 0.5,
      ...options,
    };

    const providers: ModuleProvider[] = [
      { provide: RAG_OPTIONS_TOKEN, useValue: resolvedOptions },
      {
        provide: RAG_SERVICE_TOKEN,
        useFactory: (container: Container) => {
          const embeddingService = container.resolve(EMBEDDING_SERVICE_TOKEN);
          const vectorStore = container.resolve(VECTOR_STORE_TOKEN);
          return new RagService(resolvedOptions, embeddingService as never, vectorStore as never);
        },
      },
      RagService,
    ];

    const existing = Reflect.getMetadata(MODULE_METADATA_KEY, RagModule) || {};
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      ...existing,
      imports: [
        ...(existing.imports || []),
        EmbeddingModule,
        VectorStoreModule,
      ],
      providers: [...(existing.providers || []), ...providers],
      exports: [
        ...(existing.exports || []),
        RAG_SERVICE_TOKEN,
        RagService,
      ],
    }, RagModule);

    return RagModule;
  }

  public static reset(): void {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, RagModule);
  }
}
