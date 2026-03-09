import { Body, Controller, DELETE, GET, POST, PUT, Param } from '@dangao/bun-server';

import { WorkflowService } from './workflow.service';
import type { CreateWorkflowRequest, RunWorkflowRequest, UpdateWorkflowRequest } from './types';

@Controller('/api/workflows')
export class WorkflowController {
  public constructor(private readonly workflowService: WorkflowService) {}

  @GET('/')
  public list() {
    return this.workflowService.list();
  }

  @GET('/:id')
  public get(@Param('id') id: string) {
    return this.workflowService.get(id);
  }

  @POST('/')
  public create(@Body() body: CreateWorkflowRequest) {
    return this.workflowService.create(body);
  }

  @PUT('/:id')
  public update(@Param('id') id: string, @Body() body: UpdateWorkflowRequest) {
    return this.workflowService.update(id, body);
  }

  @DELETE('/:id')
  public delete(@Param('id') id: string) {
    const deleted = this.workflowService.delete(id);
    return { deleted };
  }

  @POST('/:id/run')
  public async run(@Param('id') id: string, @Body() body: RunWorkflowRequest) {
    return this.workflowService.run(id, body);
  }
}
