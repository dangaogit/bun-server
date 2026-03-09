import type { AiToolDefinition } from '../types';
import { AI_TOOL_METADATA_KEY } from '../types';

/**
 * Registered tool entry
 */
export interface RegisteredTool extends AiToolDefinition {
  /** Bound execute function */
  execute(args: Record<string, unknown>): Promise<unknown>;
}

/**
 * Registry for all @AiTool()-decorated methods
 */
export class ToolRegistry {
  private readonly tools = new Map<string, RegisteredTool>();

  /**
   * Register a tool manually
   */
  public register(tool: RegisteredTool): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Scan an object instance for @AiTool() decorated methods and register them
   */
  public scanAndRegister(instance: object): void {
    const proto = Object.getPrototypeOf(instance);
    const methodNames = Object.getOwnPropertyNames(proto).filter(
      (key) => key !== 'constructor',
    );

    for (const methodName of methodNames) {
      const metadata: AiToolDefinition | undefined = Reflect.getMetadata(
        AI_TOOL_METADATA_KEY,
        proto,
        methodName,
      );
      if (metadata) {
        const method = (instance as Record<string, unknown>)[methodName];
        if (typeof method === 'function') {
          this.tools.set(metadata.name, {
            ...metadata,
            execute: (args: Record<string, unknown>) =>
              (method as (args: Record<string, unknown>) => Promise<unknown>).call(
                instance,
                args,
              ),
          });
        }
      }
    }
  }

  /**
   * Get all registered tools as definitions (for LLM request)
   */
  public getDefinitions(): AiToolDefinition[] {
    return Array.from(this.tools.values()).map(({ name, description, parameters }) => ({
      name,
      description,
      parameters,
    }));
  }

  /**
   * Execute a tool by name
   */
  public async execute(name: string, args: Record<string, unknown>): Promise<unknown> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool "${name}" not found in registry`);
    }
    return tool.execute(args);
  }

  /**
   * Check whether a tool exists
   */
  public has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Number of registered tools
   */
  public get size(): number {
    return this.tools.size;
  }
}
