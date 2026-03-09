import {
  Module,
  AiModule,
  ConversationModule,
  AiGuardModule,
  RagModule,
  EmbeddingModule,
  VectorStoreModule,
} from '@dangao/bun-server';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [
    AiModule,
    ConversationModule,
    AiGuardModule,
    EmbeddingModule,
    VectorStoreModule,
    RagModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
