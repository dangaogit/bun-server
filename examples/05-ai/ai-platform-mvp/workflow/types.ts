export type WorkflowNodeType = 'start' | 'end' | 'chat' | 'kb_search' | 'prompt_render' | 'agent';

export interface WorkflowNodeData {
  nodeType: WorkflowNodeType;
  label?: string;
  config?: Record<string, unknown>;
}

export interface WorkflowGraphNode {
  id: string;
  shape?: string;
  data?: WorkflowNodeData;
  position?: {
    x: number;
    y: number;
  };
}

export interface WorkflowGraphEdge {
  id?: string;
  shape?: string;
  source?: {
    cell?: string;
  };
  target?: {
    cell?: string;
  };
}

export interface WorkflowGraph {
  nodes: WorkflowGraphNode[];
  edges: WorkflowGraphEdge[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  graph: WorkflowGraph;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  graph: WorkflowGraph;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  graph?: WorkflowGraph;
}

export interface RunWorkflowRequest {
  input?: string;
  variables?: Record<string, string>;
  provider?: string;
  conversationId?: string;
}

export interface WorkflowRunStep {
  nodeId: string;
  nodeType: WorkflowNodeType;
  output: unknown;
}

export interface RunWorkflowResponse {
  workflowId: string;
  status: 'success' | 'failed';
  steps: WorkflowRunStep[];
  finalOutput: unknown;
}
