import {
  Application,
  Controller,
  GET,
  Module,
  DashboardModule,
} from '@dangao/bun-server';

@Controller('/api')
class AppController {
  @GET('/hello')
  public hello(): object {
    return { message: 'Hello from Dashboard example!' };
  }

  @GET('/data')
  public data(): object {
    return { items: [1, 2, 3], timestamp: Date.now() };
  }
}

@Module({
  imports: [
    DashboardModule.forRoot({
      path: '/_dashboard',
      auth: { username: 'admin', password: 'admin' },
    }),
  ],
  controllers: [AppController],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
await app.listen();
console.log('Dashboard example running at http://localhost:3000');
console.log('Dashboard UI: http://localhost:3000/_dashboard');
console.log('(Auth: admin / admin)');
