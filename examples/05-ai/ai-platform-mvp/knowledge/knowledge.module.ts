import { Module, EmbeddingModule, VectorStoreModule, RagModule } from '@dangao/bun-server';
import { KnowledgeController } from './knowledge.controller';
import { KnowledgeService } from './knowledge.service';

@Module({
  imports: [EmbeddingModule, VectorStoreModule, RagModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
