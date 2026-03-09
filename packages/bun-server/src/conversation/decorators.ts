import type { Context } from '../core/context';

/**
 * Parameter decorator — extracts the conversation ID from the request context
 * (from query param, header, or body) and injects it into the method parameter.
 *
 * The decorator looks for `conversationId` in: query params → headers → request body.
 *
 * @example
 * ```typescript
 * \@POST('/chat')
 * public async chat(
 *   \@InjectConversation() conversationId: string | undefined,
 *   \@Body() body: { message: string },
 * ) {
 *   const history = conversationId
 *     ? await this.conversationService.getHistory(conversationId)
 *     : [];
 *   // ...
 * }
 * ```
 */
export function InjectConversation(): ParameterDecorator {
  return (target, propertyKey, parameterIndex) => {
    const existing: number[] =
      Reflect.getMetadata('conversation:inject:params', target, propertyKey!) ?? [];
    existing.push(parameterIndex);
    Reflect.defineMetadata('conversation:inject:params', existing, target, propertyKey!);
  };
}

/**
 * Extract conversation ID from a Bun Context object.
 * Checks: query.conversationId → headers['x-conversation-id'] → (parsed body).conversationId
 */
export function extractConversationId(ctx: Context): string | undefined {
  // From query param
  const url = new URL(ctx.request.url);
  const fromQuery = url.searchParams.get('conversationId');
  if (fromQuery) return fromQuery;

  // From header
  const fromHeader = ctx.request.headers.get('x-conversation-id');
  if (fromHeader) return fromHeader;

  return undefined;
}
