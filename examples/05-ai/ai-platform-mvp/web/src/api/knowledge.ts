import { apiRequest } from './client';
import type { IngestRequest, SearchRequest, SearchResponse } from '../types/api';

export function ingestKnowledge(body: IngestRequest): Promise<{ chunks: number; collection: string }> {
  return apiRequest<{ chunks: number; collection: string }>('/api/kb/ingest', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function searchKnowledge(body: SearchRequest): Promise<SearchResponse> {
  return apiRequest<SearchResponse>('/api/kb/search', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
