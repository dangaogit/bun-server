import { describe, expect, test } from 'bun:test';
import { ToolRegistry } from '../../src/ai/tools/tool-registry';
import { AiTool } from '../../src/ai/decorators';

describe('ToolRegistry', () => {
  test('should register a tool manually', async () => {
    const registry = new ToolRegistry();
    registry.register({
      name: 'calculator',
      description: 'Calculate math',
      parameters: { type: 'object', properties: { expr: { type: 'string' } } },
      execute: async ({ expr }) => String(eval(expr as string)),
    });

    expect(registry.has('calculator')).toBe(true);
    expect(registry.size).toBe(1);
  });

  test('should scan @AiTool() decorated methods', async () => {
    class MyService {
      @AiTool({
        name: 'greet',
        description: 'Greet someone',
        parameters: { type: 'object', properties: { name: { type: 'string' } } },
      })
      public async greet({ name }: { name: string }): Promise<string> {
        return `Hello, ${name}!`;
      }
    }

    const registry = new ToolRegistry();
    registry.scanAndRegister(new MyService());

    expect(registry.has('greet')).toBe(true);
    const result = await registry.execute('greet', { name: 'Alice' });
    expect(result).toBe('Hello, Alice!');
  });

  test('should return definitions for LLM request', () => {
    const registry = new ToolRegistry();
    registry.register({
      name: 'search',
      description: 'Search the web',
      parameters: { type: 'object', properties: { query: { type: 'string' } } },
      execute: async () => [],
    });

    const defs = registry.getDefinitions();
    expect(defs).toHaveLength(1);
    expect(defs[0]!.name).toBe('search');
  });

  test('should throw when executing unknown tool', async () => {
    const registry = new ToolRegistry();
    expect(registry.execute('unknown', {})).rejects.toThrow('Tool "unknown" not found');
  });
});
