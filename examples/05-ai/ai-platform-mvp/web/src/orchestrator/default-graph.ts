import type { WorkflowGraphPayload } from '../types/api';

export const DEFAULT_GRAPH: WorkflowGraphPayload = {
  nodes: [
    {
      id: 'start-1',
      shape: 'rect',
      position: { x: 80, y: 160 },
      data: { nodeType: 'start', label: 'Start', config: {} },
    },
    {
      id: 'chat-1',
      shape: 'rect',
      position: { x: 320, y: 160 },
      data: {
        nodeType: 'chat',
        label: 'Chat',
        config: {
          message: '{{input}}',
          useRag: false,
          provider: 'openai',
          model: '',
          temperature: 0.7,
          maxTokens: 1024,
          openaiBaseUrl: '',
          openaiApiKey: '',
        },
      },
    },
    {
      id: 'end-1',
      shape: 'rect',
      position: { x: 560, y: 160 },
      data: { nodeType: 'end', label: 'End', config: {} },
    },
  ],
  edges: [
    {
      id: 'edge-1',
      shape: 'edge',
      source: { cell: 'start-1' },
      target: { cell: 'chat-1' },
    },
    {
      id: 'edge-2',
      shape: 'edge',
      source: { cell: 'chat-1' },
      target: { cell: 'end-1' },
    },
  ],
};
