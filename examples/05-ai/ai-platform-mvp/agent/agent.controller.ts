import { Controller, POST, Body } from '@dangao/bun-server';
import { AgentService, type AgentRequest } from './agent.service';

@Controller('/api/agent')
export class AgentController {
  public constructor(private readonly agent: AgentService) {}

  @POST('/run')
  public async run(@Body() body: AgentRequest) {
    return this.agent.run(body);
  }
}
