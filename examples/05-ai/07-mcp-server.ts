/**
 * MCP Server Example — McpModule
 *
 * Demonstrates:
 * - Setting up a Model Context Protocol (MCP) server
 * - Registering tools with @McpTool() decorator
 * - Registering resources with @McpResource()
 * - SSE transport for AI clients (Cursor, Claude Desktop, etc.)
 *
 * Run: bun run examples/05-ai/07-mcp-server.ts
 *
 * Connect from Claude Desktop (~/Library/Application Support/Claude/claude_desktop_config.json):
 * {
 *   "mcpServers": {
 *     "bun-server-demo": {
 *       "url": "http://localhost:3106/mcp"
 *     }
 *   }
 * }
 */
import {
  Application,
  Controller,
  Module,
  Injectable,
  Inject,
  POST,
  GET,
  McpModule,
  McpTool,
  McpResource,
  McpServer,
  McpRegistry,
  MCP_SERVER_TOKEN,
} from '@dangao/bun-server';

McpModule.forRoot({
  transport: 'sse',
  path: '/mcp',
  serverInfo: {
    name: 'bun-server-demo',
    version: '2.0.0',
    description: 'Demo MCP server built with @dangao/bun-server',
  },
});

// ── Tools ─────────────────────────────────────────────────────────────────────

@Injectable()
class DemoTools {
  private readonly notes = new Map<string, string>();

  @McpTool({
    name: 'get_time',
    description: 'Get the current date and time',
    inputSchema: { type: 'object', properties: {} },
  })
  public getTime(): string {
    return new Date().toISOString();
  }

  @McpTool({
    name: 'save_note',
    description: 'Save a text note with a key',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Note identifier' },
        content: { type: 'string', description: 'Note content' },
      },
      required: ['key', 'content'],
    },
  })
  public saveNote({ key, content }: { key: string; content: string }): string {
    this.notes.set(key, content);
    return `Note "${key}" saved successfully.`;
  }

  @McpTool({
    name: 'get_note',
    description: 'Retrieve a saved note by key',
    inputSchema: {
      type: 'object',
      properties: {
        key: { type: 'string', description: 'Note identifier' },
      },
      required: ['key'],
    },
  })
  public getNote({ key }: { key: string }): string {
    return this.notes.get(key) ?? `Note "${key}" not found.`;
  }

  @McpResource({
    uri: 'notes://list',
    name: 'All Notes',
    description: 'List all saved notes',
    mimeType: 'application/json',
  })
  public listNotes(): string {
    return JSON.stringify(Object.fromEntries(this.notes));
  }
}

// ── MCP Endpoint Controller ───────────────────────────────────────────────────

@Controller('/mcp')
class McpController {
  public constructor(
    @Inject(MCP_SERVER_TOKEN) private readonly mcpServer: McpServer,
    private readonly registry: McpRegistry,
    private readonly tools: DemoTools,
  ) {
    // Register tools by scanning the DemoTools instance
    this.registry.scan(this.tools);
  }

  /** SSE endpoint — MCP clients connect here */
  @GET('/')
  public sse(): Response {
    return this.mcpServer.createSseResponse();
  }

  /** JSON-RPC endpoint — MCP clients POST requests here */
  @POST('/')
  public async handle(): Promise<Response> {
    return new Response('MCP SSE endpoint active. Connect via GET /mcp', {
      headers: { 'Content-Type': 'text/plain' },
    });
  }
}

@Module({
  imports: [McpModule],
  controllers: [McpController],
  providers: [DemoTools],
})
class McpDemoModule {}

const port = Number(process.env.PORT ?? 3106);
const app = new Application({ port, enableSignalHandlers: false });
app.registerModule(McpDemoModule);
await app.listen();

console.log(`MCP Server running on http://localhost:${port}`);
console.log(`SSE endpoint: http://localhost:${port}/mcp`);
console.log('');
console.log('Test tools directly via JSON-RPC:');
console.log(`  curl -X POST http://localhost:${port}/mcp \\`);
console.log('    -H "Content-Type: application/json" \\');
console.log("    -d '{\"jsonrpc\": \"2.0\", \"id\": 1, \"method\": \"tools/list\"}'");
