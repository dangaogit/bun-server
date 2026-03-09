import { apiRequest } from './client';
import type { ChatRequest, ChatResponse, ConversationHistoryResponse } from '../types/api';

export function sendChat(body: ChatRequest): Promise<ChatResponse> {
  return apiRequest<ChatResponse>('/api/chat/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function fetchHistory(conversationId: string): Promise<ConversationHistoryResponse> {
  return apiRequest<ConversationHistoryResponse>(`/api/chat/${conversationId}/history`);
}

export function deleteConversation(conversationId: string): Promise<{ deleted: boolean }> {
  return apiRequest<{ deleted: boolean }>(`/api/chat/${conversationId}`, {
    method: 'DELETE',
  });
}

export async function streamChat(
  body: ChatRequest,
  onChunk: (chunk: string) => void,
): Promise<{ conversationId: string | null }> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!response.ok || !response.body) {
    throw new Error(`Stream failed with status ${response.status}`);
  }

  const conversationId = response.headers.get('x-conversation-id');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line.startsWith('data:')) {
        continue;
      }
      const payload = line.slice(5).trim();
      if (!payload) {
        continue;
      }
      try {
        const parsed = JSON.parse(payload) as {
          content?: string;
          error?: string;
          done?: boolean;
        };
        if (parsed.error) {
          throw new Error(parsed.error);
        }
        if (parsed.content) {
          onChunk(parsed.content);
        }
      } catch {
        // Fallback for non-JSON chunks.
        onChunk(payload);
      }
    }
  }

  return { conversationId };
}
