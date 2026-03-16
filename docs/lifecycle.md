# Lifecycle Hooks

Bun Server supports lifecycle hooks that let components (`@Injectable` / `@Controller`) participate from creation to destruction.

## Interfaces

| Interface | Method | When Called |
|-----------|--------|-------------|
| `ComponentClassBeforeCreate` | `static onBeforeCreate()` | Right before the component instance is created |
| `OnAfterCreate` | `onAfterCreate()` | Right after instance creation and post processors |
| `OnModuleInit` | `onModuleInit()` | After all module providers are registered |
| `OnModuleDestroy` | `onModuleDestroy()` | During shutdown (reverse order) |
| `OnBeforeDestroy` | `onBeforeDestroy()` | Before `onModuleDestroy` during shutdown (reverse order) |
| `OnAfterDestroy` | `onAfterDestroy()` | After `onModuleDestroy` during shutdown (reverse order) |
| `OnApplicationBootstrap` | `onApplicationBootstrap()` | After all modules init, before server listens |
| `OnApplicationShutdown` | `onApplicationShutdown(signal?)` | When graceful shutdown begins |

## Execution Order

**Creation (per component instance)**: `onBeforeCreate` (static) -> instantiate -> `onAfterCreate`

**Startup**: `onModuleInit` (all modules) -> `onApplicationBootstrap` (all modules) -> server starts

**Shutdown**: `onApplicationShutdown` (reverse order) -> `onBeforeDestroy` (reverse order) -> `onModuleDestroy` (reverse order) -> `onAfterDestroy` (reverse order)

For `Lifecycle.Scoped` components, destroy hooks are executed automatically at the end of each request context.

## Provider Deduplication

When the same provider instance is exported or registered by multiple tokens,
`onModuleInit` now runs only once for that instance. This avoids duplicate
initialization side effects in shared singleton objects.

## Example: Component hooks from create to destroy

```ts
import {
  Injectable,
  Controller,
  GET,
  Module,
  OnModuleInit,
  OnModuleDestroy,
  type ComponentClassBeforeCreate,
  OnAfterCreate,
  OnBeforeDestroy,
  OnAfterDestroy,
} from '@dangao/bun-server';

@Injectable()
class DatabaseService
  implements
    OnAfterCreate,
    OnModuleInit,
    OnBeforeDestroy,
    OnModuleDestroy,
    OnAfterDestroy
{
  private connected = false;

  public static onBeforeCreate(): void {
    console.log('[DatabaseService] Before create');
  }

  public onAfterCreate(): void {
    console.log('[DatabaseService] After create');
  }

  public async onModuleInit(): Promise<void> {
    console.log('[DatabaseService] Connecting...');
    await this.connect();
    this.connected = true;
  }

  public async onModuleDestroy(): Promise<void> {
    console.log('[DatabaseService] Closing connection...');
    await this.disconnect();
    this.connected = false;
  }

  public onBeforeDestroy(): void {
    console.log('[DatabaseService] Before destroy');
  }

  public onAfterDestroy(): void {
    console.log('[DatabaseService] After destroy');
  }

  public isConnected(): boolean {
    return this.connected;
  }

  private async connect(): Promise<void> {
    // Open DB connection
  }

  private async disconnect(): Promise<void> {
    // Close DB connection
  }
}

@Controller('/health')
class HealthController implements OnAfterCreate, OnBeforeDestroy, OnAfterDestroy {
  public static onBeforeCreate(): void {
    console.log('[HealthController] Before create');
  }

  public onAfterCreate(): void {
    console.log('[HealthController] After create');
  }

  public onBeforeDestroy(): void {
    console.log('[HealthController] Before destroy');
  }

  public onAfterDestroy(): void {
    console.log('[HealthController] After destroy');
  }

  @GET('/')
  public get(): object {
    return { ok: true };
  }
}

@Module({
  controllers: [HealthController],
  providers: [DatabaseService],
})
class AppModule {}
```

## Example: Application-level hooks

```ts
@Injectable()
class AppService implements OnApplicationBootstrap, OnApplicationShutdown {
  public onApplicationBootstrap(): void {
    console.log('Application bootstrapped');
  }

  public onApplicationShutdown(signal?: string): void {
    console.log(`Shutting down (signal: ${signal ?? 'none'})`);
  }
}

const _beforeCreateHook: ComponentClassBeforeCreate = DatabaseService;
```
