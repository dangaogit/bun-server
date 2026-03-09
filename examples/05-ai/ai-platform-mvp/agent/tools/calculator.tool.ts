import { Injectable, AiTool } from '@dangao/bun-server';

@Injectable()
export class CalculatorTool {
  @AiTool({
    name: 'calculator',
    description: 'Evaluate a mathematical expression. Supports +, -, *, /, (), and decimal numbers.',
    parameters: {
      type: 'object',
      properties: {
        expression: { type: 'string', description: 'Math expression to evaluate, e.g. "15 * 27 + 334"' },
      },
      required: ['expression'],
    },
  })
  public calculate({ expression }: { expression: string }): string {
    try {
      const safe = expression.replace(/[^0-9+\-*/().\s]/g, '');
      const result = Function(`'use strict'; return (${safe})`)() as number;
      return `${expression} = ${result}`;
    } catch {
      return `Error: could not evaluate "${expression}"`;
    }
  }
}
