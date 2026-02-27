# Type-Safe Client Generation

Generate a type-safe API client from your server's route manifest. The client is grouped by controller name and mirrors your controller methods.

## Workflow

1. Register controllers and start the application (or at least register routes)
2. Call `ClientGenerator.generate()` to extract the route manifest
3. Call `createClient(manifest, config)` to build the client

## ClientGenerator.generate()

Extracts route metadata from the current `RouteRegistry`:

```ts
const manifest = ClientGenerator.generate();
// { routes: [{ method, path, controllerName, methodName }, ...] }
```

Use `ClientGenerator.generateJSON()` for a JSON string.

## createClient(manifest, config)

Creates an API client:

```ts
const client = createClient(manifest, {
  baseUrl: 'http://localhost:3000',
  headers: { 'X-API-Key': 'secret' },
});
```

## Client Structure

The client is grouped by controller name (with `Controller` suffix removed and first letter lowercased). Each method maps to a function:

```ts
client.user.listUsers();                    // GET /api/users/
client.user.getUser({ params: { id: '1' } }); // GET /api/users/:id
client.user.createUser({ body: { name: 'Alice' } }); // POST /api/users/
```

## ClientRequestOptions

```ts
{
  params?: Record<string, string>;  // Path params (:id -> params.id)
  query?: Record<string, string>;    // Query string
  body?: unknown;                    // Request body (JSON)
  headers?: Record<string, string>;   // Extra headers
}
```

## Full Example

```ts
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
    return [{ id: '1', name: 'Alice' }];
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

@Module({ controllers: [UserController] })
class AppModule {}

const app = new Application({ port: 3001 });
app.registerModule(AppModule);
await app.listen();

const manifest = ClientGenerator.generate();
const client = createClient(manifest, { baseUrl: 'http://localhost:3001' });

const users = await client.user.listUsers();
const user = await client.user.getUser({ params: { id: '42' } });
const created = await client.user.createUser({ body: { name: 'Charlie' } });
```
