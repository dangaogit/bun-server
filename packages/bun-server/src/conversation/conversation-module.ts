import { Module, MODULE_METADATA_KEY } from '../di/module';
import type { ModuleProvider } from '../di/module';
import { ConversationService } from './service';
import {
  CONVERSATION_SERVICE_TOKEN,
  CONVERSATION_OPTIONS_TOKEN,
  type ConversationModuleOptions,
} from './types';
import { MemoryConversationStore } from './stores/memory-store';

@Module({ providers: [] })
export class ConversationModule {
  /**
   * Configure the conversation module with a store and optional auto-trim/summarize settings.
   *
   * @example
   * ```typescript
   * ConversationModule.forRoot({
   *   store: new MemoryConversationStore(),
   *   maxMessages: 50,
   *   autoTrim: true,
   *   summaryThreshold: 40,
   *   summarizer: async (messages) => {
   *     return await aiService.complete({ messages: [...messages, summaryRequest] }).then(r => r.content);
   *   },
   * });
   * ```
   */
  public static forRoot(options: ConversationModuleOptions = {}): typeof ConversationModule {
    const resolvedOptions: ConversationModuleOptions = {
      ...options,
      store: options.store ?? new MemoryConversationStore(),
    };

    const service = new ConversationService(resolvedOptions as ConversationModuleOptions & { store: NonNullable<ConversationModuleOptions['store']> });

    const providers: ModuleProvider[] = [
      { provide: CONVERSATION_OPTIONS_TOKEN, useValue: resolvedOptions },
      { provide: CONVERSATION_SERVICE_TOKEN, useValue: service },
      ConversationService,
    ];

    const existing = Reflect.getMetadata(MODULE_METADATA_KEY, ConversationModule) || {};
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      ...existing,
      providers: [...(existing.providers || []), ...providers],
      exports: [
        ...(existing.exports || []),
        CONVERSATION_SERVICE_TOKEN,
        ConversationService,
      ],
    }, ConversationModule);

    return ConversationModule;
  }

  /**
   * Reset module state (for testing)
   */
  public static reset(): void {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, ConversationModule);
  }
}
