import { Module, PromptModule } from '@dangao/bun-server';

import { WorkflowController } from './workflow.controller';
import { WorkflowService } from './workflow.service';

@Module({
  imports: [PromptModule],
  controllers: [WorkflowController],
  providers: [WorkflowService],
})
export class WorkflowModule {}
