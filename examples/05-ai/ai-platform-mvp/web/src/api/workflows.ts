import { apiRequest } from './client';
import type {
  WorkflowDefinition,
  WorkflowGraphPayload,
  WorkflowRunResponse,
} from '../types/api';

export function listWorkflows(): Promise<WorkflowDefinition[]> {
  return apiRequest<WorkflowDefinition[]>('/api/workflows/');
}

export function getWorkflow(id: string): Promise<WorkflowDefinition | null> {
  return apiRequest<WorkflowDefinition | null>(`/api/workflows/${id}`);
}

export function createWorkflow(body: {
  name: string;
  description?: string;
  graph: WorkflowGraphPayload;
}): Promise<WorkflowDefinition> {
  return apiRequest<WorkflowDefinition>('/api/workflows/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updateWorkflow(
  id: string,
  body: {
    name?: string;
    description?: string;
    graph?: WorkflowGraphPayload;
  },
): Promise<WorkflowDefinition | null> {
  return apiRequest<WorkflowDefinition | null>(`/api/workflows/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deleteWorkflow(id: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/api/workflows/${id}`, {
    method: 'DELETE',
  });
}

export function runWorkflow(
  id: string,
  body: {
    input?: string;
    variables?: Record<string, string>;
    provider?: string;
    conversationId?: string;
  },
): Promise<WorkflowRunResponse | null> {
  return apiRequest<WorkflowRunResponse | null>(`/api/workflows/${id}/run`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
