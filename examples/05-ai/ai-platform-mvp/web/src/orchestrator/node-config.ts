import type { WorkflowNodeData } from '../types/api';

export interface NodeTemplate {
  title: string;
  data: WorkflowNodeData;
}

export const NODE_TEMPLATES: NodeTemplate[] = [
  {
    title: 'Start',
    data: { nodeType: 'start', label: 'Start', config: {} },
  },
  {
    title: 'Chat',
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
    title: 'KB Search',
    data: {
      nodeType: 'kb_search',
      label: 'KB Search',
      config: { query: '{{lastOutput}}', collection: 'platform-kb' },
    },
  },
  {
    title: 'Prompt Render',
    data: {
      nodeType: 'prompt_render',
      label: 'Prompt Render',
      config: { template: 'Hello {{name}}, input={{input}}' },
    },
  },
  {
    title: 'Agent',
    data: {
      nodeType: 'agent',
      label: 'Agent',
      config: { task: '{{lastOutput}}', maxSteps: 8 },
    },
  },
  {
    title: 'End',
    data: { nodeType: 'end', label: 'End', config: {} },
  },
];
