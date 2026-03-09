export interface ChatRequest {
  message: string;
  conversationId?: string;
  useRag?: boolean;
  provider?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
}

export interface ChatResponse {
  conversationId: string;
  reply: string;
  usage: unknown;
  provider: string;
  historyLength: number;
}

export interface ConversationHistoryResponse {
  conversationId: string;
  messages: Array<{ role: string; content: string }>;
  count: number;
}

export interface IngestRequest {
  text?: string;
  url?: string;
  collection?: string;
}

export interface SearchRequest {
  query: string;
  collection?: string;
}

export interface SearchResponse {
  query: string;
  results: Array<{
    rank: number;
    score: number;
    content: string;
    metadata?: Record<string, unknown>;
  }>;
}

export interface AgentRequest {
  task: string;
  maxSteps?: number;
}

export interface AgentResponse {
  result: string;
  steps: number;
  toolsCalled: string[];
  usage: unknown;
}

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  description?: string;
}

export interface WorkflowNodeData {
  nodeType: 'start' | 'end' | 'chat' | 'kb_search' | 'prompt_render' | 'agent';
  label?: string;
  config?: Record<string, unknown>;
}

export interface WorkflowNode {
  id: string;
  shape?: string;
  position?: { x: number; y: number };
  data?: WorkflowNodeData;
}

export interface WorkflowEdge {
  id?: string;
  shape?: string;
  source?: { cell?: string };
  target?: { cell?: string };
}

export interface WorkflowGraphPayload {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  graph: WorkflowGraphPayload;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunResponse {
  workflowId: string;
  status: 'success' | 'failed';
  steps: Array<{
    nodeId: string;
    nodeType: string;
    output: unknown;
  }>;
  finalOutput: unknown;
}
