import type { AiToolDefinition } from './types';
import { AI_TOOL_METADATA_KEY } from './types';

/**
 * Mark a service method as an AI tool available for Tool Calling.
 *
 * @example
 * ```typescript
 * \@Injectable()
 * class CalculatorService {
 *   \@AiTool({
 *     name: 'calculate',
 *     description: 'Evaluate a mathematical expression',
 *     parameters: {
 *       type: 'object',
 *       properties: { expression: { type: 'string' } },
 *       required: ['expression'],
 *     },
 *   })
 *   public calculate({ expression }: { expression: string }): string {
 *     return String(eval(expression));
 *   }
 * }
 * ```
 */
export function AiTool(definition: AiToolDefinition): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(AI_TOOL_METADATA_KEY, definition, target, propertyKey);
  };
}
