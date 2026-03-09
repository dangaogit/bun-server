import type { McpToolDefinition, McpResourceDefinition } from './types';
import { MCP_TOOL_METADATA_KEY, MCP_RESOURCE_METADATA_KEY } from './types';

/**
 * Mark a method as an MCP tool.
 *
 * @example
 * ```typescript
 * \@McpTool({
 *   name: 'get_weather',
 *   description: 'Get current weather for a city',
 *   inputSchema: {
 *     type: 'object',
 *     properties: { city: { type: 'string' } },
 *     required: ['city'],
 *   },
 * })
 * public async getWeather({ city }: { city: string }) {
 *   return { temperature: 22, city };
 * }
 * ```
 */
export function McpTool(definition: McpToolDefinition): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(MCP_TOOL_METADATA_KEY, definition, target, propertyKey);
  };
}

/**
 * Mark a method as an MCP resource provider.
 *
 * @example
 * ```typescript
 * \@McpResource({
 *   uri: 'user://{id}',
 *   name: 'User Profile',
 *   mimeType: 'application/json',
 * })
 * public async getUserResource(\@McpParam('id') id: string) {
 *   return this.userService.find(id);
 * }
 * ```
 */
export function McpResource(definition: McpResourceDefinition): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(MCP_RESOURCE_METADATA_KEY, definition, target, propertyKey);
  };
}

/**
 * Extract a named parameter from MCP tool input arguments.
 */
export function McpParam(name: string): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const existing: Array<{ index: number; name: string }> =
      Reflect.getMetadata('mcp:params', target, propertyKey!) ?? [];
    existing.push({ index: parameterIndex, name });
    Reflect.defineMetadata('mcp:params', existing, target, propertyKey!);
  };
}
