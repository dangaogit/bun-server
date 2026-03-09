import { Controller, GET, POST, DELETE, Body, Param } from '@dangao/bun-server';
import { ChatService, type ChatRequest } from './chat.service';

@Controller('/api/chat')
export class ChatController {
  public constructor(private readonly chatService: ChatService) {}

  /** Non-streaming chat with conversation memory */
  @POST('/')
  public async chat(@Body() body: ChatRequest) {
    return this.chatService.chat(body);
  }

  /** Streaming chat (SSE) */
  @POST('/stream')
  public streamChat(@Body() body: ChatRequest): Response {
    const { stream, conversationId } = this.chatService.streamChat(body);
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'X-Conversation-Id': conversationId,
      },
    });
  }

  /** Get conversation history */
  @GET('/:id/history')
  public async getHistory(@Param('id') id: string) {
    return this.chatService.getHistory(id);
  }

  /** Delete a conversation */
  @DELETE('/:id')
  public async deleteConversation(@Param('id') id: string) {
    const deleted = await this.chatService.deleteConversation(id);
    return { deleted };
  }
}
