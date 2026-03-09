/**
 * Metadata key for @Rag() decorator
 */
export const RAG_METADATA_KEY = '@dangao/bun-server:rag:collection';

/**
 * Mark a controller method to auto-retrieve RAG context before execution.
 * The retrieved context is available via `@Inject(RAG_SERVICE_TOKEN)` in the service layer.
 *
 * @param collection - VectorStore collection to search (uses default if omitted)
 *
 * @example
 * ```typescript
 * \@POST('/ask')
 * \@Rag({ collection: 'product-docs' })
 * public async ask(\@Body() body: { question: string }) {
 *   // RAG context is automatically fetched before this method
 *   // Access via RagService.retrieve() in your service
 * }
 * ```
 */
export function Rag(options: { collection?: string } = {}): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(RAG_METADATA_KEY, options, target, propertyKey);
  };
}
