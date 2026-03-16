import {
  Application,
  Controller,
  GET,
  Module,
  ServiceRegistryModule,
} from '@dangao/bun-server';

ServiceRegistryModule.forRoot({
  provider: 'nacos',
  autoRegister: true,
  autoRegisterService: {
    serviceName: 'example-nacos-auto',
    metadata: {
      source: 'nacos-auto-register-app',
    },
  },
  nacos: {
    client: {
      serverList: [process.env.NACOS_SERVER ?? 'http://localhost:8848'],
      namespaceId: process.env.NACOS_NAMESPACE ?? 'public',
      username: process.env.NACOS_USERNAME,
      password: process.env.NACOS_PASSWORD,
    },
  },
});

@Controller('/health')
class HealthController {
  @GET('/')
  public ping() {
    return { ok: true };
  }
}

@Module({
  imports: [ServiceRegistryModule],
  controllers: [HealthController],
})
class AppModule {}

const app = new Application({
  port: Number(process.env.PORT ?? 3010),
});

app.registerModule(AppModule);
app.listen().then(() => {
  console.log('nacos-auto-register-app started');
  console.log(
    'Service will be auto-registered from ServiceRegistryModule.forRoot configuration',
  );
});

