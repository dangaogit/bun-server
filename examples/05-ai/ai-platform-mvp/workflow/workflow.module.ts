import { Module } from '@dangao/bun-server';

import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [],
  controllers: [WorkflowController],
  providers: [WorkflowService],
})
export class WorkflowModule {}
