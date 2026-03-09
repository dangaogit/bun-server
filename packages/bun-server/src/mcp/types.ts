/**
 * MCP tool definition
 */
export interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

/**
 * MCP resource definition
 */
export interface McpResourceDefinition {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

/**
 * MCP server info
 */
export interface McpServerInfo {
  name: string;
  version: string;
  description?: string;
}

/**
 * MCP transport type
 */
export type McpTransport = 'sse' | 'stdio';

export interface McpModuleOptions {
  transport?: McpTransport;
  /** Path for SSE endpoint (default: '/mcp') */
  path?: string;
  serverInfo: McpServerInfo;
}

export const MCP_SERVER_TOKEN = Symbol('@dangao/bun-server:mcp:server');
export const MCP_OPTIONS_TOKEN = Symbol('@dangao/bun-server:mcp:options');

/** Metadata key for @McpTool() */
export const MCP_TOOL_METADATA_KEY = '@dangao/bun-server:mcp:tool';
/** Metadata key for @McpResource() */
export const MCP_RESOURCE_METADATA_KEY = '@dangao/bun-server:mcp:resource';

/** JSON-RPC 2.0 Request */
export interface JsonRpcRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: unknown;
}

/** JSON-RPC 2.0 Response */
export interface JsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}
