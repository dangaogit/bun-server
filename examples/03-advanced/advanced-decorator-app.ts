/**
 * Custom Decorator Example - Advanced
 * 
 * This example demonstrates advanced usage of custom decorators and interceptors:
 * - Multiple interceptors chained together
 * - Accessing container services
 * - Accessing request context
 * - Error handling
 * - Priority control
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
  Injectable,
  Inject,
} from '@dangao/bun-server';
import { BaseInterceptor } from '@dangao/bun-server';
import type { InterceptorRegistry, Interceptor } from '@dangao/bun-server';
import type { Container } from '@dangao/bun-server';
import type { Context } from '@dangao/bun-server';

// ============================================================================
// Example 1: Logging Interceptor with BaseInterceptor
// ============================================================================

const LOG_METADATA_KEY = Symbol('@example:log');

export interface LogOptions {
  level?: 'info' | 'debug' | 'warn';
  includeArgs?: boolean;
  includeResult?: boolean;
}

export function Log(options: LogOptions = {}): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(LOG_METADATA_KEY, options, target, propertyKey);
  };
}

class LogInterceptor extends BaseInterceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    const options = this.getMetadata<LogOptions>(target, propertyKey, LOG_METADATA_KEY) || {};
    const level = options.level || 'info';
    const methodName = String(propertyKey);

    // Pre-processing
    await this.before(target, propertyKey, args, container, context);
    if (options.includeArgs) {
      console.log(`[${level.toUpperCase()}] ${methodName} - Args:`, args);
    } else {
      console.log(`[${level.toUpperCase()}] ${methodName} - Executing`);
    }

    try {
      // Execute original method
      const result = await Promise.resolve(originalMethod.apply(target, args));

      // Post-processing
      const finalResult = await this.after(target, propertyKey, result, container, context) as T;
      if (options.includeResult) {
        console.log(`[${level.toUpperCase()}] ${methodName} - Result:`, finalResult);
      } else {
        console.log(`[${level.toUpperCase()}] ${methodName} - Completed`);
      }

      return finalResult;
    } catch (error) {
      // Error handling
      return await this.onError(target, propertyKey, error, container, context);
    }
  }

  protected override async onError(
    target: unknown,
    propertyKey: string | symbol,
    error: unknown,
    container: Container,
    context?: Context,
  ): Promise<never> {
    const methodName = String(propertyKey);
    console.error(`[ERROR] ${methodName} - Failed:`, error);
    throw error;
  }
}

// ============================================================================
// Example 2: Authorization Interceptor with Context Access
// ============================================================================

const AUTH_METADATA_KEY = Symbol('@example:auth');

export interface AuthOptions {
  required?: boolean;
  roles?: string[];
}

export function Auth(options: AuthOptions = {}): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(AUTH_METADATA_KEY, options, target, propertyKey);
  };
}

class AuthInterceptor extends BaseInterceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    const options = this.getMetadata<AuthOptions>(target, propertyKey, AUTH_METADATA_KEY) || {};

    if (!context) {
      // No context available, proceed
      return await Promise.resolve(originalMethod.apply(target, args));
    }

    // Get authorization header
    const authHeader = this.getHeader(context, 'Authorization');
    const isAuthenticated = !!authHeader;

    // Check if authentication is required
    if (options.required && !isAuthenticated) {
      context.setStatus(401);
      throw new Error('Unauthorized');
    }

    // Check roles if specified
    if (options.roles && options.roles.length > 0 && isAuthenticated) {
      // In a real app, you would decode the token and check roles
      const userRole = authHeader?.split(' ')[1] || 'user'; // Simplified
      if (!options.roles.includes(userRole)) {
        context.setStatus(403);
        throw new Error('Forbidden');
      }
    }

    // Add user info to context (for use in controller)
    if (isAuthenticated) {
      (context as any).user = { id: '1', role: 'user' };
    }

    return await Promise.resolve(originalMethod.apply(target, args));
  }
}

// ============================================================================
// Example 3: Cache Interceptor with Container Service Access
// ============================================================================

const CACHE_METADATA_KEY = Symbol('@example:cache');

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  key?: string; // Custom cache key
}

export function Cache(options: CacheOptions = {}): MethodDecorator {
  return (target, propertyKey) => {
    Reflect.defineMetadata(CACHE_METADATA_KEY, options, target, propertyKey);
  };
}

/**
 * Simple cache service
 */
@Injectable()
class CacheService {
  private readonly cache = new Map<string, { value: unknown; expiresAt: number }>();

  public get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  public set(key: string, value: unknown, ttl: number): void {
    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
  }
}

class CacheInterceptor extends BaseInterceptor {
  public async execute<T>(
    target: unknown,
    propertyKey: string | symbol,
    originalMethod: (...args: unknown[]) => T | Promise<T>,
    args: unknown[],
    container: Container,
    context?: Context,
  ): Promise<T> {
    const options = this.getMetadata<CacheOptions>(target, propertyKey, CACHE_METADATA_KEY) || {};
    const ttl = options.ttl || 60000; // Default 1 minute

    // Resolve cache service from container
    const cacheService = this.resolveService<CacheService>(container, CacheService);

    // Generate cache key
    const methodName = String(propertyKey);
    const cacheKey = options.key || `${methodName}:${JSON.stringify(args)}`;

    // Try to get from cache
    const cached = cacheService.get<T>(cacheKey);
    if (cached !== null) {
      console.log(`[Cache] ${methodName} - Cache hit`);
      return cached;
    }

    console.log(`[Cache] ${methodName} - Cache miss`);

    // Execute original method
    const result = await Promise.resolve(originalMethod.apply(target, args));

    // Store in cache
    cacheService.set(cacheKey, result, ttl);

    return result;
  }
}

// ============================================================================
// Application Setup
// ============================================================================

const app = new Application({ port: 3001 });
const registry = app.getContainer().resolve<InterceptorRegistry>(INTERCEPTOR_REGISTRY_TOKEN);

// Register interceptors with different priorities
// Lower priority numbers execute first
registry.register(LOG_METADATA_KEY, new LogInterceptor(), 150); // Execute last
registry.register(AUTH_METADATA_KEY, new AuthInterceptor(), 50); // Execute first (after system interceptors)
registry.register(CACHE_METADATA_KEY, new CacheInterceptor(), 100); // Execute in middle

// Register cache service
const container = app.getContainer();
container.register(CacheService);

// ============================================================================
// Controllers
// ============================================================================

@Controller('/api/products')
class ProductController {
  private readonly products = [
    { id: '1', name: 'Product 1', price: 100 },
    { id: '2', name: 'Product 2', price: 200 },
  ];

  @GET('/')
  @Log({ level: 'info', includeArgs: false })
  @Cache({ ttl: 30000 }) // Cache for 30 seconds
  public listProducts() {
    console.log('[Controller] Fetching products from database...');
    return this.products;
  }

  @GET('/:id')
  @Log({ level: 'debug', includeArgs: true, includeResult: true })
  @Auth({ required: true })
  @Cache({ ttl: 60000 })
  public getProduct(@Param('id') id: string) {
    const product = this.products.find(p => p.id === id);
    if (!product) {
      throw new Error('Product not found');
    }
    return product;
  }

  @POST('/')
  @Log({ level: 'info' })
  @Auth({ required: true, roles: ['admin'] })
  public createProduct(@Body() body: { name: string; price: number }) {
    const product = {
      id: String(this.products.length + 1),
      name: body.name,
      price: body.price,
    };
    this.products.push(product);
    return product;
  }
}

app.registerController(ProductController);

// Start server
const port = 3001;
app.listen(port);

console.log(`🚀 Advanced example server running on http://localhost:${port}`);
console.log(`\n📝 Example endpoints:`);
console.log(`   GET  http://localhost:${port}/api/products (cached, logged)`);
console.log(`   GET  http://localhost:${port}/api/products/1 (requires auth, cached, logged)`);
console.log(`   POST http://localhost:${port}/api/products (requires admin auth, logged)`);
console.log(`\n💡 Try:`);
console.log(`   1. GET /api/products (check cache logs)`);
console.log(`   2. GET /api/products/1 (will fail without Authorization header)`);
console.log(`   3. GET /api/products/1 -H "Authorization: Bearer admin" (success)`);
console.log(`   4. POST /api/products -H "Authorization: Bearer admin" -d '{"name":"New","price":300}'`);

