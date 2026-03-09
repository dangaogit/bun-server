import { Graph } from '@antv/x6';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  createWorkflow,
  deleteWorkflow,
  listWorkflows,
  runWorkflow,
  updateWorkflow,
} from '../api/workflows';
import { streamChat } from '../api/chat';
import type {
  WorkflowDefinition,
  WorkflowEdge,
  WorkflowGraphPayload,
  WorkflowNode,
  WorkflowNodeData,
} from '../types/api';
import { DEFAULT_GRAPH } from '../orchestrator/default-graph';
import { NODE_TEMPLATES } from '../orchestrator/node-config';

interface SelectedNodeModel {
  id: string;
  data: WorkflowNodeData;
}

interface PreviewMessage {
  role: 'user' | 'assistant';
  content: string;
}

function serializeGraph(graph: Graph): WorkflowGraphPayload {
  const nodes: WorkflowNode[] = graph.getNodes().map((node) => ({
    id: node.id,
    shape: node.shape,
    position: node.getPosition(),
    data: (node.getData() ?? { nodeType: 'chat', config: {} }) as WorkflowNodeData,
  }));
  const edges: WorkflowEdge[] = graph.getEdges().map((edge) => ({
    id: edge.id,
    shape: edge.shape,
    source: { cell: edge.getSourceCellId() ?? undefined },
    target: { cell: edge.getTargetCellId() ?? undefined },
  }));
  return { nodes, edges };
}

function toX6Cells(payload: WorkflowGraphPayload): Array<Record<string, unknown>> {
  const nodeCells = payload.nodes.map((node) => ({
    id: node.id,
    shape: node.shape ?? 'rect',
    x: node.position?.x ?? 80,
    y: node.position?.y ?? 80,
    width: 170,
    height: 56,
    data: node.data,
    attrs: {
      body: { fill: '#0f172a', stroke: '#334155', rx: 8, ry: 8 },
      label: { text: node.data?.label ?? node.data?.nodeType ?? 'Node', fill: '#e2e8f0' },
    },
  }));
  const edgeCells = payload.edges.map((edge) => ({
    id: edge.id,
    shape: edge.shape ?? 'edge',
    source: edge.source,
    target: edge.target,
    attrs: { line: { stroke: '#94a3b8', strokeWidth: 1.5 } },
  }));
  return [...nodeCells, ...edgeCells];
}

export function WorkflowPage() {
  const graphContainerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<Graph | null>(null);
  const [selectedNode, setSelectedNode] = useState<SelectedNodeModel | null>(null);
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [workflowId, setWorkflowId] = useState('');
  const [workflowName, setWorkflowName] = useState('demo-workflow');
  const [workflowDescription, setWorkflowDescription] = useState('X6 workflow demo');
  const [runInput, setRunInput] = useState('Introduce Bun runtime.');
  const [variablesJson, setVariablesJson] = useState('{"name":"Alice","app":"AI Platform MVP"}');
  const [runResult, setRunResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewConversationId, setPreviewConversationId] = useState('');
  const [previewInput, setPreviewInput] = useState('Introduce Bun runtime.');
  const [previewMessages, setPreviewMessages] = useState<PreviewMessage[]>([]);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [previewUseSse, setPreviewUseSse] = useState(true);

  const nodeDataJson = useMemo(
    () => JSON.stringify(selectedNode?.data?.config ?? {}, null, 2),
    [selectedNode],
  );
  const [nodeConfigJson, setNodeConfigJson] = useState('{}');

  useEffect(() => {
    setNodeConfigJson(nodeDataJson);
  }, [nodeDataJson]);

  useEffect(() => {
    if (!graphContainerRef.current || graphRef.current) {
      return;
    }
    const graph = new Graph({
      container: graphContainerRef.current,
      background: {
        color: '#020617',
      },
      grid: {
        visible: true,
        size: 16,
      },
      panning: true,
      mousewheel: true,
      selecting: {
        enabled: true,
        multiple: false,
      },
      interacting: true,
      connecting: {
        allowBlank: false,
        allowLoop: false,
        highlight: true,
        connector: 'rounded',
      },
    });
    graphRef.current = graph;

    graph.on('node:click', ({ node }) => {
      graph.getNodes().forEach((item) => {
        item.attr('body/stroke', '#334155');
      });
      node.attr('body/stroke', '#3b82f6');
      setSelectedNode({
        id: node.id,
        data: (node.getData() ?? { nodeType: 'chat', config: {} }) as WorkflowNodeData,
      });
    });
    graph.on('blank:click', () => {
      graph.getNodes().forEach((item) => {
        item.attr('body/stroke', '#334155');
      });
      setSelectedNode(null);
    });
    graph.on('node:change:data', ({ node }) => {
      if (selectedNode?.id === node.id) {
        setSelectedNode({
          id: node.id,
          data: (node.getData() ?? { nodeType: 'chat', config: {} }) as WorkflowNodeData,
        });
      }
    });

    graph.fromJSON({ cells: toX6Cells(DEFAULT_GRAPH) });
  }, [selectedNode?.id]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!selectedNode || !graphRef.current) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const isFormElement = target
        ? target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable
        : false;
      if (isFormElement) {
        return;
      }

      if (event.key === 'Backspace' || event.key === 'Delete') {
        const cell = graphRef.current.getCellById(selectedNode.id);
        if (cell && cell.isNode()) {
          graphRef.current.removeCell(cell);
          setSelectedNode(null);
          event.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedNode]);

  const refreshWorkflows = async () => {
    const list = await listWorkflows();
    setWorkflows(list);
  };

  useEffect(() => {
    void refreshWorkflows();
  }, []);

  const addNode = (nodeType: WorkflowNodeData['nodeType'], point?: { x: number; y: number }) => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }
    const template = NODE_TEMPLATES.find((item) => item.data.nodeType === nodeType);
    if (!template) {
      return;
    }
    const id = `${nodeType}-${crypto.randomUUID().slice(0, 8)}`;
    graph.addNode({
      id,
      shape: 'rect',
      x: point?.x ?? 120 + Math.floor(Math.random() * 300),
      y: point?.y ?? 100 + Math.floor(Math.random() * 220),
      width: 170,
      height: 56,
      data: template.data,
      attrs: {
        body: { fill: '#0f172a', stroke: '#334155', rx: 8, ry: 8 },
        label: { text: template.data.label ?? template.title, fill: '#e2e8f0' },
      },
    });
  };

  const applyNodeConfig = () => {
    if (!selectedNode || !graphRef.current) {
      return;
    }
    const node = graphRef.current.getCellById(selectedNode.id);
    if (!node || !node.isNode()) {
      return;
    }
    const parsed = JSON.parse(nodeConfigJson) as Record<string, unknown>;
    const nextData: WorkflowNodeData = {
      ...selectedNode.data,
      config: parsed,
    };
    node.setData(nextData);
    node.attr('label/text', nextData.label ?? nextData.nodeType);
    setSelectedNode({
      id: selectedNode.id,
      data: nextData,
    });
  };

  const saveWorkflow = async () => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }
    setLoading(true);
    try {
      const payload = serializeGraph(graph);
      if (!workflowId) {
        const created = await createWorkflow({
          name: workflowName,
          description: workflowDescription,
          graph: payload,
        });
        setWorkflowId(created.id);
      } else {
        await updateWorkflow(workflowId, {
          name: workflowName,
          description: workflowDescription,
          graph: payload,
        });
      }
      await refreshWorkflows();
    } finally {
      setLoading(false);
    }
  };

  const loadWorkflow = async (id: string) => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }
    const item = workflows.find((wf) => wf.id === id);
    if (!item) {
      return;
    }
    setWorkflowId(item.id);
    setWorkflowName(item.name);
    setWorkflowDescription(item.description ?? '');
    graph.clearCells();
    graph.fromJSON({ cells: toX6Cells(item.graph) });
  };

  const removeWorkflow = async () => {
    if (!workflowId) {
      return;
    }
    setLoading(true);
    try {
      await deleteWorkflow(workflowId);
      setWorkflowId('');
      await refreshWorkflows();
    } finally {
      setLoading(false);
    }
  };

  const run = async () => {
    const graph = graphRef.current;
    if (!graph) {
      return;
    }
    setLoading(true);
    try {
      let currentId = workflowId;
      if (!currentId) {
        const created = await createWorkflow({
          name: workflowName,
          description: workflowDescription,
          graph: serializeGraph(graph),
        });
        currentId = created.id;
        setWorkflowId(currentId);
      } else {
        await updateWorkflow(currentId, {
          name: workflowName,
          description: workflowDescription,
          graph: serializeGraph(graph),
        });
      }

      const variables = JSON.parse(variablesJson) as Record<string, string>;
      const response = await runWorkflow(currentId, { input: runInput, variables });
      setRunResult(JSON.stringify(response, null, 2));
      await refreshWorkflows();
    } finally {
      setLoading(false);
    }
  };

  const runPreviewChat = async () => {
    if (!previewInput.trim()) {
      return;
    }
    const graph = graphRef.current;
    if (!graph) {
      return;
    }
    setPreviewBusy(true);
    try {
      let currentId = workflowId;
      if (!currentId) {
        const created = await createWorkflow({
          name: workflowName,
          description: workflowDescription,
          graph: serializeGraph(graph),
        });
        currentId = created.id;
        setWorkflowId(currentId);
      } else {
        await updateWorkflow(currentId, {
          name: workflowName,
          description: workflowDescription,
          graph: serializeGraph(graph),
        });
      }

      const variables = JSON.parse(variablesJson) as Record<string, string>;
      const messageText = previewInput;
      setPreviewMessages((prev) => [...prev, { role: 'user', content: messageText }]);
      setPreviewInput('');

      if (previewUseSse) {
        const payload = serializeGraph(graph);
        const chatNode = payload.nodes.find((node) => node.data?.nodeType === 'chat');
        if (!chatNode) {
          throw new Error('SSE preview requires at least one chat node in current workflow.');
        }

        const config = (chatNode.data?.config ?? {}) as Record<string, unknown>;
        const resolveString = (value: unknown, fallback: string): string => {
          if (typeof value !== 'string' || value.length === 0) {
            return fallback;
          }
          return value
            .replaceAll('{{input}}', messageText)
            .replaceAll('{{lastOutput}}', messageText);
        };
        const resolveOptionalNumber = (value: unknown): number | undefined => {
          if (typeof value === 'number' && Number.isFinite(value)) {
            return value;
          }
          if (typeof value === 'string' && value.trim().length > 0) {
            const parsed = Number(value);
            if (Number.isFinite(parsed)) {
              return parsed;
            }
          }
          return undefined;
        };

        let assistantText = '';
        setPreviewMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

        const result = await streamChat(
          {
            message: resolveString(config['message'], messageText),
            conversationId: previewConversationId || undefined,
            useRag: Boolean(config['useRag']),
            provider: typeof config['provider'] === 'string' ? config['provider'] : undefined,
            model: typeof config['model'] === 'string' && config['model'].length > 0
              ? config['model']
              : undefined,
            openaiBaseUrl: typeof config['openaiBaseUrl'] === 'string' && config['openaiBaseUrl'].length > 0
              ? config['openaiBaseUrl']
              : undefined,
            openaiApiKey: typeof config['openaiApiKey'] === 'string' && config['openaiApiKey'].length > 0
              ? config['openaiApiKey']
              : undefined,
            systemPrompt: typeof config['systemPrompt'] === 'string'
              ? resolveString(config['systemPrompt'], '')
              : undefined,
            temperature: resolveOptionalNumber(config['temperature']),
            maxTokens: resolveOptionalNumber(config['maxTokens']),
          },
          (chunk) => {
            assistantText += chunk;
            setPreviewMessages((prev) => {
              if (prev.length === 0) {
                return [{ role: 'assistant', content: assistantText }];
              }
              const next = [...prev];
              const last = next[next.length - 1];
              if (last && last.role === 'assistant') {
                next[next.length - 1] = {
                  ...last,
                  content: assistantText,
                };
                return next;
              }
              return [...next, { role: 'assistant', content: assistantText }];
            });
          },
        );

        if (result.conversationId) {
          setPreviewConversationId(result.conversationId);
        }
        await refreshWorkflows();
        return;
      }

      const response = await runWorkflow(currentId, {
        input: messageText,
        variables,
        conversationId: previewConversationId || undefined,
      });

      let assistantText = '(empty response)';
      if (response?.finalOutput && typeof response.finalOutput === 'object') {
        const output = response.finalOutput as Record<string, unknown>;
        if (typeof output['conversationId'] === 'string') {
          setPreviewConversationId(output['conversationId']);
        }
        if (typeof output['reply'] === 'string') {
          assistantText = output['reply'];
        } else if (typeof output['rendered'] === 'string') {
          assistantText = output['rendered'];
        } else if (typeof output['result'] === 'string') {
          assistantText = output['result'];
        } else {
          assistantText = JSON.stringify(output, null, 2);
        }
      } else if (typeof response?.finalOutput === 'string') {
        assistantText = response.finalOutput;
      }

      setPreviewMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
      await refreshWorkflows();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setPreviewMessages((prev) => [...prev, { role: 'assistant', content: `Error: ${message}` }]);
    } finally {
      setPreviewBusy(false);
    }
  };

  return (
    <section className='panel'>
      <h2>Workflow Orchestrator (X6)</h2>
      <div className='workflow-toolbar'>
        <label>
          Workflow Name
          <input value={workflowName} onChange={(e) => setWorkflowName(e.target.value)} />
        </label>
        <label>
          Description
          <input
            value={workflowDescription}
            onChange={(e) => setWorkflowDescription(e.target.value)}
          />
        </label>
        <label>
          Workflow
          <select
            value={workflowId}
            onChange={(e) => {
              const id = e.target.value;
              setWorkflowId(id);
              if (id) {
                void loadWorkflow(id);
              }
            }}
          >
            <option value=''>Unsaved</option>
            {workflows.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <button type='button' onClick={saveWorkflow} disabled={loading}>
          Save
        </button>
        <button type='button' onClick={removeWorkflow} disabled={!workflowId || loading}>
          Delete
        </button>
      </div>

      <div className='workflow-shell'>
        <aside className='node-palette'>
          <h3>Nodes</h3>
          {NODE_TEMPLATES.map((template) => (
            <button
              type='button'
              key={template.title}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.setData('application/x-node-type', template.data.nodeType);
              }}
              onClick={() => addNode(template.data.nodeType)}
            >
              {template.title}
            </button>
          ))}
          <p className='hint'>
            拖拽节点到画布可创建节点；点击节点可选中；Backspace/Delete 删除选中节点。
          </p>
        </aside>
        <div
          ref={graphContainerRef}
          className='graph-canvas'
          onDragOver={(event) => {
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            const nodeType = event.dataTransfer.getData('application/x-node-type') as WorkflowNodeData['nodeType'];
            if (!nodeType || !graphRef.current) {
              return;
            }
            const localPoint = graphRef.current.clientToLocal({
              x: event.clientX,
              y: event.clientY,
            });
            addNode(nodeType, localPoint);
          }}
        />
        <aside className='node-inspector'>
          <h3>Node Inspector</h3>
          {selectedNode ? (
            <>
              <p>ID: {selectedNode.id}</p>
              <p>Type: {selectedNode.data.nodeType}</p>
              <label>
                Label
                <input
                  value={selectedNode.data.label ?? ''}
                  onChange={(e) => {
                    if (!graphRef.current) {
                      return;
                    }
                    const node = graphRef.current.getCellById(selectedNode.id);
                    if (!node || !node.isNode()) {
                      return;
                    }
                    const nextData: WorkflowNodeData = {
                      ...selectedNode.data,
                      label: e.target.value,
                    };
                    node.setData(nextData);
                    node.attr('label/text', e.target.value || nextData.nodeType);
                    setSelectedNode({
                      id: selectedNode.id,
                      data: nextData,
                    });
                  }}
                />
              </label>
              <label>
                Config JSON
                <textarea
                  rows={10}
                  value={nodeConfigJson}
                  onChange={(e) => setNodeConfigJson(e.target.value)}
                />
              </label>
              <button type='button' onClick={applyNodeConfig}>
                Apply Config
              </button>
            </>
          ) : (
            <p className='hint'>选择一个节点以编辑属性。</p>
          )}
        </aside>
      </div>

      <div className='workflow-runner'>
        <label>
          Run Input
          <input value={runInput} onChange={(e) => setRunInput(e.target.value)} />
        </label>
        <label>
          Variables JSON
          <textarea
            rows={3}
            value={variablesJson}
            onChange={(e) => setVariablesJson(e.target.value)}
          />
        </label>
        <button type='button' onClick={run} disabled={loading}>
          Run Workflow
        </button>
      </div>
      <article>
        <h3>Run Result</h3>
        <pre>{runResult || '(empty)'}</pre>
      </article>

      <article className='preview-panel'>
        <h3>Chat Preview (Minimal Loop)</h3>
        <label className='checkbox-line'>
          <input
            type='checkbox'
            checked={previewUseSse}
            onChange={(event) => setPreviewUseSse(event.target.checked)}
          />
          Use SSE stream mode (based on current workflow chat node config)
        </label>
        <div className='preview-chat-window'>
          {previewMessages.length === 0 ? (
            <p className='hint'>发送消息后，这里会显示按当前编排执行后的对话结果。</p>
          ) : (
            previewMessages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={item.role === 'user' ? 'preview-msg user' : 'preview-msg assistant'}
              >
                <strong>{item.role === 'user' ? 'You' : 'Workflow'}</strong>
                <pre>{item.content}</pre>
              </div>
            ))
          )}
        </div>
        <div className='preview-input-row'>
          <input
            value={previewInput}
            onChange={(event) => setPreviewInput(event.target.value)}
            placeholder='Type a message to test current workflow...'
          />
          <button type='button' onClick={runPreviewChat} disabled={previewBusy}>
            Send
          </button>
          <button
            type='button'
            onClick={() => {
              setPreviewMessages([]);
              setPreviewConversationId('');
            }}
            disabled={previewBusy}
          >
            Reset
          </button>
        </div>
      </article>
    </section>
  );
}
