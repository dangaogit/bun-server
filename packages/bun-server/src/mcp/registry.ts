import type { McpToolDefinition, McpResourceDefinition } from './types';
import { MCP_TOOL_METADATA_KEY, MCP_RESOURCE_METADATA_KEY } from './types';

export interface RegisteredMcpTool extends McpToolDefinition {
  execute(args: Record<string, unknown>): Promise<unknown>;
}

export interface RegisteredMcpResource extends McpResourceDefinition {
  read(uriParams: Record<string, string>): Promise<unknown>;
}

/**
 * Registry for MCP tools and resources discovered via decorators.
 */
export class McpRegistry {
  private readonly tools = new Map<string, RegisteredMcpTool>();
  private readonly resources = new Map<string, RegisteredMcpResource>();

  /**
   * Scan an object instance for @McpTool() and @McpResource() decorated methods
   */
  public scan(instance: object): void {
    const proto = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (key) => key !== 'constructor',
    );

    for (const methodName of methodNames) {
      const toolDef: McpToolDefinition | undefined = Reflect.getMetadata(
        MCP_TOOL_METADATA_KEY,
        proto,
        methodName,
      );
      if (toolDef) {
        const method = (instance as Record<string, unknown>)[methodName] as (args: unknown) => Promise<unknown>;
        this.tools.set(toolDef.name, {
          ...toolDef,
          execute: (args) => method.call(instance, args),
        });
      }

      const resourceDef: McpResourceDefinition | undefined = Reflect.getMetadata(
        MCP_RESOURCE_METADATA_KEY,
        proto,
        methodName,
      );
      if (resourceDef) {
        const method = (instance as Record<string, unknown>)[methodName] as (params: unknown) => Promise<unknown>;
        this.resources.set(resourceDef.uri, {
          ...resourceDef,
          read: (params) => method.call(instance, params),
        });
      }
    }
  }

  public getTools(): RegisteredMcpTool[] {
    return Array.from(this.tools.values());
  }

  public getResources(): RegisteredMcpResource[] {
    return Array.from(this.resources.values());
  }

  public getTool(name: string): RegisteredMcpTool | undefined {
    return this.tools.get(name);
  }

  public getResource(uri: string): RegisteredMcpResource | undefined {
    return this.resources.get(uri);
  }
}
