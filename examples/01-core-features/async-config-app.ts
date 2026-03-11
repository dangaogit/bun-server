import {
  Application,
  ConfigModule,
  ConfigService,
  CONFIG_SERVICE_TOKEN,
  Controller,
  GET,
  Inject,
  Module,
} from '@dangao/bun-server';

// Simulate async config loading (e.g. from remote config center, vault, etc.)
async function loadRemoteConfig(): Promise<{ app: { name: string; port: number } }> {
  console.log('[Config] Loading remote config...');
  await new Promise((resolve) => setTimeout(resolve, 200));
  const port = Number(process.env.PORT ?? 3000);
  return {
    app: { name: 'AsyncConfigApp', port },
  };
}

@Controller('/api')
class AppController {
  public constructor(
    @Inject(CONFIG_SERVICE_TOKEN) private readonly config: ConfigService,
  ) {}

  @GET('/config')
  public getConfig(): object {
    return {
      name: this.config.get('app.name'),
      port: this.config.get('app.port'),
    };
  }
}

// Use forRootAsync to load config asynchronously during Application.listen()
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

const port = Number(process.env.PORT ?? 3000);
const app = new Application({ port });
app.registerModule(AppModule);
await app.listen();
console.log(`Async Config example running at http://localhost:${port}`);
console.log(`Try: curl http://localhost:${port}/api/config`);
