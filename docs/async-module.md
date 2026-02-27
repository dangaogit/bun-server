# Async Module Configuration

Some modules support `forRootAsync()` for configuration that depends on asynchronous sources (remote config, secrets, database lookups). The async factory runs during `Application.listen()` before the server starts.

## AsyncModuleOptions<T>

```ts
interface AsyncModuleOptions<T> {
  imports?: ModuleClass[];   // Modules providing inject dependencies
  inject?: ProviderToken[];  // Tokens to inject into useFactory
  useFactory: (...deps: unknown[]) => T | Promise<T>;
}
```

## Available Modules

- **ConfigModule** – Load config from remote sources
- **DatabaseModule** – Get DB options from ConfigService or secrets
- **CacheModule** – Get cache config asynchronously

## Example: ConfigModule.forRootAsync

```ts
@Module({
  imports: [
    ConfigModule.forRootAsync({
      useFactory: async () => {
        const remoteConfig = await loadRemoteConfig();
        return { defaultConfig: remoteConfig };
      },
    }),
  ],
  controllers: [AppController],
})
class AppModule {}
```

## Example: DatabaseModule.forRootAsync with ConfigService

```ts
import { ConfigModule, CONFIG_SERVICE_TOKEN } from '@dangao/bun-server';

@Module({
  imports: [
    ConfigModule.forRoot({ defaultConfig: { db: { url: '...' } } }),
    DatabaseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [CONFIG_SERVICE_TOKEN],
      useFactory: (config: ConfigService) => ({
        url: config.get<string>('db.url'),
        // ...other options
      }),
    }),
  ],
})
class AppModule {}
```

The `useFactory` receives resolved dependencies in the order of `inject`. Async providers are initialized sequentially during `listen()`.
