import type { AiMessage, AiToolCall } from '../types';
import type { ToolRegistry } from './tool-registry';

/**
 * Executes tool calls from LLM responses and formats results as AiMessages
 */
export class ToolExecutor {
  public constructor(private readonly registry: ToolRegistry) {}

  /**
   * Execute all tool calls in parallel and return result messages
   */
  public async executeAll(toolCalls: AiToolCall[]): Promise<AiMessage[]> {
    const results = await Promise.all(
      toolCalls.map((call) => this.executeOne(call)),
    );
    return results;
  }

  private async executeOne(call: AiToolCall): Promise<AiMessage> {
    let content: string;
    try {
      const result = await this.registry.execute(call.name, call.arguments);
      content =
        typeof result === 'string'
          ? result
          : JSON.stringify(result, null, 2);
    } catch (err) {
      content = `Error executing tool "${call.name}": ${err instanceof Error ? err.message : String(err)}`;
    }

    return {
      role: 'tool',
      content,
      toolCallId: call.id,
    };
  }
}
