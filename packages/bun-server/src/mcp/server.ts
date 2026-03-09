import type { McpServerInfo, JsonRpcRequest, JsonRpcResponse } from './types';
import type { McpRegistry } from './registry';

/**
 * MCP protocol server — handles JSON-RPC 2.0 requests from MCP clients.
 * Supports SSE transport (HTTP) and stdio transport.
 *
 * Implements MCP specification 2024-11-05.
 */
export class McpServer {
  private readonly registry: McpRegistry;
  private readonly serverInfo: McpServerInfo;

  public constructor(registry: McpRegistry, serverInfo: McpServerInfo) {
    this.registry = registry;
    this.serverInfo = serverInfo;
  }

  /**
   * Handle an incoming JSON-RPC request and return a response
   */
  public async handle(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      const result = await this.dispatch(request.method, request.params);
      return { jsonrpc: '2.0', id: request.id ?? null, result };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id: request.id ?? null,
        error: {
          code: err instanceof McpError ? err.code : -32603,
          message: err instanceof Error ? err.message : 'Internal error',
        },
      };
    }
  }

  /**
   * Handle a raw HTTP request body (JSON-RPC over HTTP)
   * Returns a Response suitable for Bun's serve()
   */
  public async handleHttp(req: Request): Promise<Response> {
    const body = await req.json() as JsonRpcRequest;
    const response = await this.handle(body);
    return new Response(JSON.stringify(response), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Create an SSE response that keeps the connection open for streaming
   * This is the SSE transport endpoint
   */
  public createSseResponse(): Response {
    const registry = this.registry;
    const serverInfo = this.serverInfo;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      start(controller) {
        // Send initial server info event
        const initEvent = `event: endpoint\ndata: ${JSON.stringify({
          type: 'endpoint',
          method: 'POST',
        })}\n\n`;
        controller.enqueue(encoder.encode(initEvent));

        // Keep connection alive with periodic pings
        const pingInterval = setInterval(() => {
          try {
            controller.enqueue(encoder.encode(': ping\n\n'));
          } catch {
            clearInterval(pingInterval);
          }
        }, 15000);
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-MCP-Server': `${serverInfo.name}/${serverInfo.version}`,
      },
    });
  }

  private async dispatch(method: string, params: unknown): Promise<unknown> {
    switch (method) {
      case 'initialize':
        return {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: this.serverInfo,
        };

      case 'tools/list':
        return {
          tools: this.registry.getTools().map((t) => ({
            name: t.name,
            description: t.description,
            inputSchema: t.inputSchema,
          })),
        };

      case 'tools/call': {
        const { name, arguments: args = {} } = params as { name: string; arguments?: Record<string, unknown> };
        const tool = this.registry.getTool(name);
        if (!tool) throw new McpError(-32601, `Tool "${name}" not found`);
        const result = await tool.execute(args);
        return {
          content: [
            {
              type: 'text',
              text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'resources/list':
        return {
          resources: this.registry.getResources().map((r) => ({
            uri: r.uri,
            name: r.name,
            description: r.description,
            mimeType: r.mimeType,
          })),
        };

      case 'resources/read': {
        const { uri } = params as { uri: string };
        const resource = this.registry.getResource(uri);
        if (!resource) throw new McpError(-32601, `Resource "${uri}" not found`);
        const content = await resource.read({});
        return {
          contents: [
            {
              uri,
              mimeType: resource.mimeType ?? 'application/json',
              text: typeof content === 'string' ? content : JSON.stringify(content),
            },
          ],
        };
      }

      case 'ping':
        return {};

      default:
        throw new McpError(-32601, `Method "${method}" not found`);
    }
  }
}

class McpError extends Error {
  public constructor(
    public readonly code: number,
    message: string,
  ) {
    super(message);
  }
}
