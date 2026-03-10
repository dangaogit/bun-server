import { Body, Controller, DELETE, GET, POST, PUT, Param, HttpException } from '@dangao/bun-server';

import { WorkflowService } from './workflow.service';
import type {
  CreateWorkflowRequest,
  RunWorkflowGraphRequest,
  RunWorkflowRequest,
  UpdateWorkflowRequest,
} from './types';

@Controller('/api/workflows')
export class WorkflowController {
  public constructor(private readonly workflowService: WorkflowService) {}

  @GET('/')
  public list() {
    throw new HttpException(
      410,
      'Server-side workflow storage is disabled. Use client cache instead.',
    );
  }

  @GET('/:id')
  public get(@Param('id') id: string) {
    void id;
    throw new HttpException(
      410,
      'Server-side workflow storage is disabled. Use client cache instead.',
    );
  }

  @POST('/')
  public create(@Body() body: CreateWorkflowRequest) {
    void body;
    throw new HttpException(
      410,
      'Server-side workflow storage is disabled. Use client cache instead.',
    );
  }

  @PUT('/:id')
  public update(@Param('id') id: string, @Body() body: UpdateWorkflowRequest) {
    void id;
    void body;
    throw new HttpException(
      410,
      'Server-side workflow storage is disabled. Use client cache instead.',
    );
  }

  @DELETE('/:id')
  public delete(@Param('id') id: string) {
    void id;
    throw new HttpException(
      410,
      'Server-side workflow storage is disabled. Use client cache instead.',
    );
  }

  @POST('/:id/run')
  public async run(@Param('id') id: string, @Body() body: RunWorkflowRequest) {
    void id;
    void body;
    throw new HttpException(
      410,
      'Workflow execution by persisted ID is disabled. Use POST /api/workflows/run with graph payload.',
    );
  }

  @POST('/run')
  public async runWithGraph(@Body() body: RunWorkflowGraphRequest) {
    return this.workflowService.runWithGraph(body);
  }
}
