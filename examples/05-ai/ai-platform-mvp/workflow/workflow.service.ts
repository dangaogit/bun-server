import { Injectable, Inject } from '@dangao/bun-server';
import { PromptService, PROMPT_SERVICE_TOKEN } from '@dangao/bun-server';

import type {
  CreateWorkflowRequest,
  RunWorkflowRequest,
  RunWorkflowResponse,
  UpdateWorkflowRequest,
  WorkflowDefinition,
  WorkflowGraphNode,
  WorkflowNodeType,
  WorkflowRunStep,
} from './types';

interface WorkflowRuntimeState {
  input: string;
  variables: Record<string, string>;
  provider?: string;
  conversationId?: string;
  lastOutput: unknown;
  nodeOutputs: Record<string, unknown>;
}

@Injectable()
export class WorkflowService {
  private readonly workflows = new Map<string, WorkflowDefinition>();
  private readonly baseUrl = process.env['WORKFLOW_EXEC_BASE_URL'] ?? 'http://localhost:3500';

  public constructor(
    @Inject(PROMPT_SERVICE_TOKEN) private readonly promptService: PromptService,
  ) {}

  /**
   * 列出所有工作流定义
   */
  public list(): WorkflowDefinition[] {
    return [...this.workflows.values()].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  /**
   * 根据 ID 获取工作流
   * @param id - 工作流 ID
   * @returns 工作流定义
   */
  public get(id: string): WorkflowDefinition | null {
    return this.workflows.get(id) ?? null;
  }

  /**
   * 创建工作流定义
   * @param request - 创建请求
   * @returns 已创建工作流
   */
  public create(request: CreateWorkflowRequest): WorkflowDefinition {
    const now = new Date().toISOString();
    const workflow: WorkflowDefinition = {
      id: crypto.randomUUID(),
      name: request.name,
      description: request.description,
      graph: request.graph,
      createdAt: now,
      updatedAt: now,
    };
    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  /**
   * 更新工作流定义
   * @param id - 工作流 ID
   * @param request - 更新请求
   * @returns 更新后的工作流
   */
  public update(id: string, request: UpdateWorkflowRequest): WorkflowDefinition | null {
    const existing = this.workflows.get(id);
    if (!existing) {
      return null;
    }

    const updated: WorkflowDefinition = {
      ...existing,
      name: request.name ?? existing.name,
      description: request.description ?? existing.description,
      graph: request.graph ?? existing.graph,
      updatedAt: new Date().toISOString(),
    };
    this.workflows.set(id, updated);
    return updated;
  }

  /**
   * 删除工作流定义
   * @param id - 工作流 ID
   * @returns 是否删除成功
   */
  public delete(id: string): boolean {
    return this.workflows.delete(id);
  }

  /**
   * 执行工作流（按拓扑顺序执行可达节点）
   * @param id - 工作流 ID
   * @param request - 运行时输入
   * @returns 执行结果
   */
  public async run(id: string, request: RunWorkflowRequest): Promise<RunWorkflowResponse | null> {
    const workflow = this.workflows.get(id);
    if (!workflow) {
      return null;
    }

    const steps: WorkflowRunStep[] = [];
    const state: WorkflowRuntimeState = {
      input: request.input ?? '',
      variables: request.variables ?? {},
      provider: request.provider,
      conversationId: request.conversationId,
      lastOutput: request.input ?? '',
      nodeOutputs: {},
    };

    const nodes = workflow.graph.nodes ?? [];
    const edges = workflow.graph.edges ?? [];
    const order = this.resolveExecutionOrder(nodes, edges);

    try {
      for (const node of order) {
        const nodeType = node.data?.nodeType ?? 'chat';
        if (nodeType === 'start' || nodeType === 'end') {
          continue;
        }

        const output = await this.executeNode(node, nodeType, state);
        state.lastOutput = output;
        state.nodeOutputs[node.id] = output;
        steps.push({
          nodeId: node.id,
          nodeType,
          output,
        });
      }

      return {
        workflowId: id,
        status: 'success',
        steps,
        finalOutput: state.lastOutput,
      };
    } catch (error) {
      steps.push({
        nodeId: 'runtime',
        nodeType: 'agent',
        output: {
          error: error instanceof Error ? error.message : 'Unknown workflow error',
        },
      });
      return {
        workflowId: id,
        status: 'failed',
        steps,
        finalOutput: state.lastOutput,
      };
    }
  }

  private resolveExecutionOrder(nodes: WorkflowGraphNode[], edges: Array<{ source?: { cell?: string }; target?: { cell?: string } }>): WorkflowGraphNode[] {
    const nodeMap = new Map<string, WorkflowGraphNode>();
    const inDegree = new Map<string, number>();
    const outgoing = new Map<string, string[]>();

    for (const node of nodes) {
      nodeMap.set(node.id, node);
      inDegree.set(node.id, 0);
      outgoing.set(node.id, []);
    }

    for (const edge of edges) {
      const sourceId = edge.source?.cell;
      const targetId = edge.target?.cell;
      if (!sourceId || !targetId || !nodeMap.has(sourceId) || !nodeMap.has(targetId)) {
        continue;
      }
      outgoing.get(sourceId)?.push(targetId);
      inDegree.set(targetId, (inDegree.get(targetId) ?? 0) + 1);
    }

    const queue: string[] = [];
    for (const [nodeId, degree] of inDegree.entries()) {
      if (degree === 0) {
        queue.push(nodeId);
      }
    }

    const ordered: WorkflowGraphNode[] = [];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) {
        break;
      }
      const currentNode = nodeMap.get(currentId);
      if (currentNode) {
        ordered.push(currentNode);
      }
      const targets = outgoing.get(currentId) ?? [];
      for (const targetId of targets) {
        const degree = (inDegree.get(targetId) ?? 0) - 1;
        inDegree.set(targetId, degree);
        if (degree === 0) {
          queue.push(targetId);
        }
      }
    }

    if (ordered.length === nodes.length) {
      return ordered;
    }

    // 图中存在环时，退化为原始节点顺序，保证 MVP 仍可执行
    return nodes;
  }

  private async executeNode(node: WorkflowGraphNode, nodeType: WorkflowNodeType, state: WorkflowRuntimeState): Promise<unknown> {
    const config = node.data?.config ?? {};

    if (nodeType === 'chat') {
      const message = this.resolveString(config['message'], state);
      const response = await this.postJson('/api/chat/', {
        message,
        conversationId: state.conversationId,
        useRag: Boolean(config['useRag']),
        provider: this.resolveString(config['provider'], state, state.provider),
        model: this.resolveOptionalString(config['model'], state),
        systemPrompt: this.resolveOptionalString(config['systemPrompt'], state),
        temperature: this.resolveOptionalNumber(config['temperature']),
        maxTokens: this.resolveOptionalNumber(config['maxTokens']),
        openaiApiKey: this.resolveOptionalString(config['openaiApiKey'], state),
        openaiBaseUrl: this.resolveOptionalString(config['openaiBaseUrl'], state),
      });
      if (
        typeof response === 'object' &&
        response !== null &&
        'conversationId' in response &&
        typeof response['conversationId'] === 'string'
      ) {
        state.conversationId = response['conversationId'];
      }
      return response;
    }

    if (nodeType === 'kb_search') {
      const query = this.resolveString(config['query'], state);
      const response = await this.postJson('/api/kb/search', {
        query,
        collection: this.resolveString(config['collection'], state, undefined),
      });
      return response;
    }

    if (nodeType === 'prompt_render') {
      const templateRef = this.resolveString(config['templateId'], state);
      const templateId = await this.resolvePromptTemplateId(templateRef);
      const rendered = await this.promptService.render(templateId, {
        ...state.variables,
        input: state.input,
        lastOutput: this.stringifyOutput(state.lastOutput),
      });
      return { templateId, rendered };
    }

    if (nodeType === 'agent') {
      const task = this.resolveString(config['task'], state);
      const response = await this.postJson('/api/agent/run', {
        task,
        maxSteps: Number(config['maxSteps'] ?? 8),
      });
      return response;
    }

    return state.lastOutput;
  }

  private resolveString(value: unknown, state: WorkflowRuntimeState, fallback: string = state.input): string {
    if (typeof value === 'string' && value.length > 0) {
      return value
        .replaceAll('{{input}}', state.input)
        .replaceAll('{{lastOutput}}', this.stringifyOutput(state.lastOutput));
    }
    return fallback;
  }

  private resolveOptionalString(value: unknown, state: WorkflowRuntimeState): string | undefined {
    if (typeof value !== 'string' || value.length === 0) {
      return undefined;
    }
    return this.resolveString(value, state, '');
  }

  private resolveOptionalNumber(value: unknown): number | undefined {
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
  }

  private stringifyOutput(value: unknown): string {
    if (typeof value === 'string') {
      return value;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private async postJson(path: string, body: Record<string, unknown>): Promise<unknown> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Workflow node request failed (${response.status}): ${details}`);
    }
    return response.json();
  }

  private async resolvePromptTemplateId(templateRef: string): Promise<string> {
    if (!templateRef) {
      throw new Error('prompt_render node requires config.templateId');
    }

    try {
      const byId = await this.promptService.get(templateRef);
      if (byId) {
        return byId.id;
      }
    } catch {
      // fallback to name lookup
    }

    const templates = await this.promptService.list();
    const byName = templates.find((item) => item.name === templateRef);
    if (byName) {
      return byName.id;
    }

    throw new Error(`Prompt template "${templateRef}" not found`);
  }
}
