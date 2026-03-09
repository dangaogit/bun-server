import { apiRequest } from './client';
import type { PromptTemplate } from '../types/api';

export function listPrompts(): Promise<PromptTemplate[]> {
  return apiRequest<PromptTemplate[]>('/api/prompts/');
}

export function createPrompt(body: {
  name: string;
  content: string;
  description?: string;
}): Promise<PromptTemplate> {
  return apiRequest<PromptTemplate>('/api/prompts/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function updatePrompt(
  id: string,
  body: {
    name?: string;
    content?: string;
    description?: string;
  },
): Promise<PromptTemplate> {
  return apiRequest<PromptTemplate>(`/api/prompts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export function deletePrompt(id: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/api/prompts/${id}`, {
    method: 'DELETE',
  });
}

export function renderPrompt(
  id: string,
  variables: Record<string, string>,
): Promise<{ rendered: string }> {
  return apiRequest<{ rendered: string }>(`/api/prompts/${id}/render`, {
    method: 'POST',
    body: JSON.stringify({ variables }),
  });
}
