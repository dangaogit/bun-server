import { describe, expect, test } from 'bun:test';
import { McpServer } from '../../src/mcp/server';
import { McpRegistry } from '../../src/mcp/registry';
import { McpTool } from '../../src/mcp/decorators';
import type { McpServerInfo } from '../../src/mcp/types';

const serverInfo: McpServerInfo = { name: 'test-server', version: '1.0.0' };

function createServer(): { server: McpServer; registry: McpRegistry } {
  const registry = new McpRegistry();
  const server = new McpServer(registry, serverInfo);
  return { server, registry };
}

describe('McpServer', () => {
  test('should handle initialize request', async () => {
    const { server } = createServer();
    const response = await server.handle({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });

    expect(response.error).toBeUndefined();
    expect((response.result as Record<string, unknown>)['protocolVersion']).toBeDefined();
    expect((response.result as Record<string, unknown>)['serverInfo']).toMatchObject(serverInfo);
  });

  test('should list tools', async () => {
    const { server, registry } = createServer();

    class MyTools {
      @McpTool({ name: 'echo', description: 'Echo input', inputSchema: { type: 'object' } })
      async echo({ text }: { text: string }) { return text; }
    }
    registry.scan(new MyTools());

    const response = await server.handle({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    const tools = (response.result as { tools: unknown[] }).tools;
    expect(tools).toHaveLength(1);
    expect((tools[0] as Record<string, unknown>)['name']).toBe('echo');
  });

  test('should call a tool', async () => {
    const { server, registry } = createServer();

    class EchoTool {
      @McpTool({ name: 'echo', description: 'Echo', inputSchema: {} })
      async echo(args: { text: string }) { return `Echo: ${args.text}`; }
    }
    registry.scan(new EchoTool());

    const response = await server.handle({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: { name: 'echo', arguments: { text: 'Hello' } },
    });

    expect(response.error).toBeUndefined();
    const content = (response.result as { content: Array<{ text: string }> }).content;
    expect(content[0]!.text).toContain('Hello');
  });

  test('should return error for unknown method', async () => {
    const { server } = createServer();
    const response = await server.handle({ jsonrpc: '2.0', id: 4, method: 'unknown/method' });
    expect(response.error).toBeDefined();
    expect(response.error!.code).toBe(-32601);
  });

  test('should return error for unknown tool call', async () => {
    const { server } = createServer();
    const response = await server.handle({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'non-existent', arguments: {} },
    });
    expect(response.error).toBeDefined();
  });

  test('should handle ping', async () => {
    const { server } = createServer();
    const response = await server.handle({ jsonrpc: '2.0', id: 6, method: 'ping' });
    expect(response.error).toBeUndefined();
    expect(response.result).toEqual({});
  });
});
