import { Module, AiModule, AiGuardModule } from '@dangao/bun-server';
import { AgentController } from './agent.controller';
import { AgentService } from './agent.service';
import { CalculatorTool } from './tools/calculator.tool';
import { WebSearchTool } from './tools/web-search.tool';
import { KbQueryTool } from './tools/kb-query.tool';

@Module({
  imports: [AiModule, AiGuardModule],
  controllers: [AgentController],
  providers: [AgentService, CalculatorTool, WebSearchTool, KbQueryTool],
  exports: [AgentService],
})
export class AgentModule {}
