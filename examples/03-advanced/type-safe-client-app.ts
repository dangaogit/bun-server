import {
  Application,
  Controller,
  GET,
  POST,
  Param,
  Body,
  Module,
  ClientGenerator,
  createClient,
} from '@dangao/bun-server';

@Controller('/api/users')
class UserController {
  @GET('/')
  public listUsers(): object {
    return [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
    ];
  }

  @GET('/:id')
  public getUser(@Param('id') id: string): object {
    return { id, name: 'Alice' };
  }

  @POST('/')
  public createUser(@Body() body: unknown): object {
    return { ...(body as object), id: '3' };
  }
}

@Module({
  controllers: [UserController],
})
class AppModule {}

const app = new Application({ port: 3001, enableSignalHandlers: false });
app.registerModule(AppModule);
await app.listen();

// Generate route manifest from registered controllers
const manifest = ClientGenerator.generate();
console.log('Route Manifest:', JSON.stringify(manifest, null, 2));

// Create type-safe client
const client = createClient(manifest, {
  baseUrl: 'http://localhost:3001',
});

// Use the client
const users = await client.user.listUsers();
console.log('Users:', users);

const user = await client.user.getUser({ params: { id: '42' } });
console.log('User:', user);

const newUser = await client.user.createUser({ body: { name: 'Charlie' } });
console.log('Created:', newUser);

await app.stop();
console.log('Type-Safe Client example completed.');
