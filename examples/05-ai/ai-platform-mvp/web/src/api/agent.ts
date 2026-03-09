import { apiRequest } from './client';
import type { AgentRequest, AgentResponse } from '../types/api';

export function runAgent(body: AgentRequest): Promise<AgentResponse> {
  return apiRequest<AgentResponse>('/api/agent/run', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
