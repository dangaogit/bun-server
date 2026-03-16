import {
  Application,
  Body,
  Controller,
  DbSession,
  db,
  DatabaseModule,
  GET,
  POST,
  Module
} from '@dangao/bun-server';

DatabaseModule.forRoot({
  type: 'sqlite',
  databasePath: './data.db',
  defaultStrategy: 'pool',
  wal: true,
});

@Controller('/api/users')
class UserController {
  @GET('/init')
  public async init() {
    await db`CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL
    )`;
    return { ok: true };
  }

  @GET('/')
  public async getAllUsers() {
    const users = await db`SELECT id, name, email FROM users ORDER BY id`;
    return { success: true, data: users };
  }

  @DbSession()
  @POST('/')
  public async createUser(@Body() body: { name: string; email: string }) {
    await db.transaction(async () => {
      await db`INSERT INTO users (name, email) VALUES (${body.name}, ${body.email})`;
      await db`SELECT ${1}`;
    });
    return { success: true };
  }
}

@Module({
  imports: [DatabaseModule],
  controllers: [UserController],
})
class AppModule {}

const port = Number(process.env.PORT ?? 3000);
const app = new Application({ port });

app.registerModule(AppModule);

app.listen().then(() => {
  console.log(`🚀 Server started on http://localhost:${port}`);
  console.log(`  GET  /api/users/init`);
  console.log(`  GET  /api/users`);
  console.log(`  POST /api/users`);
});
