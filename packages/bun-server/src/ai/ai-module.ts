import { Module, MODULE_METADATA_KEY } from '../di/module';
import type { ModuleProvider } from '../di/module';
import { AiService } from './service';
import {
  AI_SERVICE_TOKEN,
  AI_MODULE_OPTIONS_TOKEN,
  AI_TOOL_REGISTRY_TOKEN,
  type AiModuleOptions,
} from './types';
import { ToolRegistry } from './tools/tool-registry';

@Module({ providers: [] })
export class AiModule {
  /**
   * Configure the AI module with one or more LLM providers.
   *
   * @example
   * ```typescript
   * AiModule.forRoot({
   *   providers: [
   *     { name: 'openai', provider: OpenAIProvider, config: { apiKey: '...' }, default: true },
   *     { name: 'ollama', provider: OllamaProvider, config: {} },
   *   ],
   *   fallback: true,
   *   timeout: 30000,
   * });
   * ```
   */
  public static forRoot(options: AiModuleOptions): typeof AiModule {
    const toolRegistry = new ToolRegistry();
    const aiService = new AiService(options);
    aiService.setToolRegistry(toolRegistry);

    const providers: ModuleProvider[] = [
      { provide: AI_MODULE_OPTIONS_TOKEN, useValue: options },
      { provide: AI_SERVICE_TOKEN, useValue: aiService },
      { provide: AI_TOOL_REGISTRY_TOKEN, useValue: toolRegistry },
      AiService,
    ];

    const existing = Reflect.getMetadata(MODULE_METADATA_KEY, AiModule) || {};
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      ...existing,
      providers: [...(existing.providers || []), ...providers],
      exports: [
        ...(existing.exports || []),
        AI_SERVICE_TOKEN,
        AI_TOOL_REGISTRY_TOKEN,
        AiService,
      ],
    }, AiModule);

    return AiModule;
  }

  /**
   * Reset module state (for testing)
   */
  public static reset(): void {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, AiModule);
  }
}
