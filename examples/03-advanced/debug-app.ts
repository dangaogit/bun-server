import {
  Application,
  Controller,
  GET,
  POST,
  Body,
  Module,
  DebugModule,
} from '@dangao/bun-server';

@Controller('/api')
class AppController {
  @GET('/hello')
  public hello(): object {
    return { message: 'Hello!' };
  }

  @POST('/echo')
  public echo(@Body() body: unknown): unknown {
    return body;
  }

  @GET('/slow')
  public async slow(): Promise<object> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return { message: 'Slow response' };
  }
}

@Module({
  imports: [
    DebugModule.forRoot({
      enabled: true,
      maxRecords: 100,
      recordBody: true,
      path: '/_debug',
    }),
  ],
  controllers: [AppController],
})
class AppModule {}

const app = new Application({ port: 3000 });
app.registerModule(AppModule);
await app.listen();
console.log('Debug example running at http://localhost:3000');
console.log('Debug UI: http://localhost:3000/_debug');
console.log('Try: curl http://localhost:3000/api/hello');
console.log('Then check the debug UI to see recorded requests.');
