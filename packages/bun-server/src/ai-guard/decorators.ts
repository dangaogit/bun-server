import type { AiGuardModuleOptions } from './types';
import { AI_GUARD_METADATA_KEY } from './types';

/**
 * Mark a controller method to run AI guard checks on the request body.
 * Requires `AiGuardModule` to be configured.
 *
 * @example
 * ```typescript
 * \@POST('/chat')
 * \@AiGuard({ piiDetection: true, moderation: true, promptInjection: true })
 * public async chat(\@Body() body: { message: string }) {
 *   // body.message has already been checked and sanitized
 * }
 * ```
 */
export function AiGuard(options: Partial<AiGuardModuleOptions> = {}): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(AI_GUARD_METADATA_KEY, options, target, propertyKey);
  };
}
