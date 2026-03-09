import { Controller, POST, Body } from '@dangao/bun-server';
import { KnowledgeService, type IngestRequest, type SearchRequest } from './knowledge.service';

@Controller('/api/kb')
export class KnowledgeController {
  public constructor(private readonly service: KnowledgeService) {}

  @POST('/ingest')
  public async ingest(@Body() body: IngestRequest) {
    return this.service.ingest(body);
  }

  @POST('/search')
  public async search(@Body() body: SearchRequest) {
    return this.service.search(body);
  }
}
