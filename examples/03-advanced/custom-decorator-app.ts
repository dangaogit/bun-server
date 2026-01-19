/**
 * Custom Decorator Example - Basic
 * 
 * This example demonstrates how to create and use custom decorators with interceptors.
 * It shows:
 * - Creating a custom decorator
 * - Implementing an interceptor
 * - Registering the interceptor
 * - Using the decorator in controllers
 */

import 'reflect-metadata';
import {
  Application,
  Controller,
  GET,
  POST,
  Body,
  Param,
  INTERCEPTOR_REGISTRY_TOKEN,
} from '@dangao/bun-server';
import type { InterceptorRegistry, Interceptor } from '@dangao/bun-server';
import type { Container } from '@dangao/bun-server';
import type { Context } from '@dangao/bun-server';

// ============================================================================
// Step 1: Define Metadata Key
// ============================================================================

/**
 * Metadata key for the @Timing decorator
 * Use Symbol to ensure uniqueness
 */
const TIMING_METADATA_KEY = Symbol('@example:timing');

// ============================================================================
// Step 2: Create Custom Decorator
// ============================================================================

/**
 * Timing decorator options
 */
export interface TimingOptions {
  /**
   * Custom label for the timing log
   */
  label?: string;
}

/**
 * @Timing decorator
 * Marks a method to be timed
 * 
 * @example
 * ```typescript
 * @GET('/users/:id')
 * @Timing({ label: 'Get User' })
 * public getUser(@Param('id') id: string) {
 *   return { id, name: 'Alice' };
 * }
 * ```
 */
export function Timing(options: TimingOptions = {}): MethodDecorator {
  return (target, propertyKey, descriptor) => {
    // Store metadata on the method
    Reflect.defineMetadata(TIMING_METADATA_KEY, options, target, propertyKey);
  };
}

// ============================================================================
// Step 3: Implement Interceptor
// ============================================================================

/**
 * Timing interceptor
 * Measures method execution time and logs it
 */
class TimingInterceptor implements Interceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    // Get metadata
    // Note: Decorators store metadata on the prototype, not on instances
    // If target is an instance, we need to check the prototype chain
    let metadata: TimingOptions | undefined;
    if (typeof target === 'object' && target !== null) {
      // First try direct lookup (if target is prototype)
      metadata = Reflect.getMetadata(TIMING_METADATA_KEY, target, propertyKey) as TimingOptions | undefined;
      
      // If not found and target is an instance, check prototype
      if (metadata === undefined) {
        const prototype = Object.getPrototypeOf(target);
        if (prototype && prototype !== Object.prototype) {
          metadata = Reflect.getMetadata(TIMING_METADATA_KEY, prototype, propertyKey) as TimingOptions | undefined;
        }
        
        // Also check constructor prototype as fallback
        if (metadata === undefined) {
          const constructor = (target as any).constructor;
          if (constructor && typeof constructor === 'function' && constructor.prototype) {
            metadata = Reflect.getMetadata(TIMING_METADATA_KEY, constructor.prototype, propertyKey) as TimingOptions | undefined;
          }
        }
      }
    }
    
    const label = metadata?.label || String(propertyKey);

    // Start timing
    const start = performance.now();
    console.log(`[Timing] ${label} - Start`);

    try {
      // Execute the original method
      const result = await Promise.resolve(originalMethod.apply(target, args));

      // Calculate duration
      const duration = performance.now() - start;
      console.log(`[Timing] ${label} - Completed in ${duration.toFixed(2)}ms`);

      return result;
    } catch (error) {
      // Calculate duration even on error
      const duration = performance.now() - start;
      console.error(`[Timing] ${label} - Failed after ${duration.toFixed(2)}ms`, error);
      throw error;
    }
  }
}

// ============================================================================
// Step 4: Register Interceptor
// ============================================================================

const app = new Application({ port: 3000 });

// Get the interceptor registry from the container
const registry = app.getContainer().resolve<InterceptorRegistry>(INTERCEPTOR_REGISTRY_TOKEN);

// Register the interceptor with the metadata key
// Priority 100 means it will execute after system interceptors (like transactions)
registry.register(TIMING_METADATA_KEY, new TimingInterceptor(), 100);

// ============================================================================
// Step 5: Use the Decorator in Controllers
// ============================================================================

@Controller('/api/users')
class UserController {
  private readonly users = new Map<string, { id: string; name: string }>([
    ['1', { id: '1', name: 'Alice' }],
    ['2', { id: '2', name: 'Bob' }],
  ]);

  @GET('/')
  @Timing({ label: 'List Users' })
  public listUsers() {
    // Simulate some work
    return Array.from(this.users.values());
  }

  @GET('/:id')
  @Timing({ label: 'Get User' })
  public getUser(@Param('id') id: string) {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  @POST('/')
  @Timing({ label: 'Create User' })
  public createUser(@Body() body: { name: string }) {
    const id = String(this.users.size + 1);
    const user = { id, name: body.name };
    this.users.set(id, user);
    return user;
  }
}

// Register the controller
app.registerController(UserController);

// Start the server
const port = 3000;
app.listen(port);

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📝 Example endpoints:`);
console.log(`   GET  http://localhost:${port}/api/users`);
console.log(`   GET  http://localhost:${port}/api/users/1`);
console.log(`   POST http://localhost:${port}/api/users`);
console.log(`\n💡 Check the console for timing logs!`);

