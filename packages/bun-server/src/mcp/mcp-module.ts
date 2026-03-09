import { Module, MODULE_METADATA_KEY } from '../di/module';
import type { ModuleProvider } from '../di/module';
import { McpServer } from './server';
import { McpRegistry } from './registry';
import { MCP_SERVER_TOKEN, MCP_OPTIONS_TOKEN, type McpModuleOptions } from './types';

@Module({ providers: [] })
export class McpModule {
  /**
   * Configure the MCP module.
   *
   * @example
   * ```typescript
   * McpModule.forRoot({
   *   transport: 'sse',
   *   path: '/mcp',
   *   serverInfo: { name: 'my-api', version: '1.0.0' },
   * });
   *
   * // Register tools by scanning instances:
   * const registry = container.resolve<McpRegistry>(MCP_SERVER_TOKEN);
   * registry.scan(myServiceInstance);
   * ```
   */
  public static forRoot(options: McpModuleOptions): typeof McpModule {
    const registry = new McpRegistry();
    const server = new McpServer(registry, options.serverInfo);

    const resolvedOptions: McpModuleOptions = {
      transport: 'sse',
      path: '/mcp',
      ...options,
    };

    const providers: ModuleProvider[] = [
      { provide: MCP_OPTIONS_TOKEN, useValue: resolvedOptions },
      { provide: MCP_SERVER_TOKEN, useValue: server },
      { provide: McpRegistry, useValue: registry },
    ];

    const existing = Reflect.getMetadata(MODULE_METADATA_KEY, McpModule) || {};
    Reflect.defineMetadata(MODULE_METADATA_KEY, {
      ...existing,
      providers: [...(existing.providers || []), ...providers],
      exports: [
        ...(existing.exports || []),
        MCP_SERVER_TOKEN,
        McpRegistry,
      ],
    }, McpModule);

    return McpModule;
  }

  public static reset(): void {
    Reflect.deleteMetadata(MODULE_METADATA_KEY, McpModule);
  }
}
