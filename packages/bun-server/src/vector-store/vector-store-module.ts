import { Module, MODULE_METADATA_KEY } from '../di/module';
import type { ModuleProvider } from '../di/module';
import {
  VECTOR_STORE_TOKEN,
  VECTOR_STORE_OPTIONS_TOKEN,
  type VectorStoreModuleOptions,
} from './types';
import { MemoryVectorStore } from './stores/memory-store';

@Module({ providers: [] })
export class VectorStoreModule {
  /**
   * Configure the vector store module.
   *
   * @example
   * ```typescript
   * // Built-in memory store (default):
   * VectorStoreModule.forRoot({});
   *
   * // Pinecone:
   * VectorStoreModule.forRoot({
   *   store: new PineconeVectorStore({ apiKey: '...', host: '...' }),
   * });
   * ```
   */
  public static forRoot(options: VectorStoreModuleOptions = {}): typeof VectorStoreModule {
    const store = options.store ?? new MemoryVectorStore();

    const providers: ModuleProvider[] = [
      { provide: VECTOR_STORE_OPTIONS_TOKEN, useValue: options },
      { provide: VECTOR_STORE_TOKEN, useValue: store },
    ];

    const existing = Reflect.getMetadata(MODULE_METADATA_KEY, VectorStoreModule) || {};
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      ...existing,
      providers: [...(existing.providers || []), ...providers],
      exports: [
        ...(existing.exports || []),
        VECTOR_STORE_TOKEN,
      ],
    }, VectorStoreModule);

    return VectorStoreModule;
  }

  public static reset(): void {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, VectorStoreModule);
  }
}
