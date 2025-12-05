
import {
  Application,
  Body,
  Controller,
  createLoggerMiddleware,
  GET,
  Inject,
  Injectable,
  IsString,
  LOGGER_TOKEN,
  LoggerExtension,
  LogLevel,
  Module,
  Param,
  POST,
  Validate,
} from "bun-server";
import type { Logger } from "logsmith";

@Injectable()
class UserService {
  private readonly users = new Map<string, { id: string; name: string }>([[
    "1",
    { id: "1", name: "Alice" },
  ]]);

  public find(id: string) {
    return this.users.get(id);
  }

  public create(name: string) {
    const id = String(this.users.size + 1);
    const user = { id, name };
    this.users.set(id, user);
    return user;
  }
}

@Controller("/api/users")
class UserController {
  public constructor(
    @Inject(UserService) private readonly service: UserService,
    @Inject(LOGGER_TOKEN) private readonly logger: Logger,
  ) {}

  @GET("/:id")
  public getUser(@Param("id") id: string) {
    this.logger.info("Fetch user", { id });
    const user = this.service.find(id);
    if (!user) {
      return { error: "Not Found" };
    }
    return user;
  }

  @POST("/")
  public createUser(@Body("name") @Validate(IsString()) name: string) {
    this.logger.info("Create user", { name });
    return this.service.create(name);
  }
}

@Module({
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
class UserModule {}

const port = Number(process.env.PORT ?? 3100);
const app = new Application({ port });
app.registerExtension(
  new LoggerExtension({
    prefix: "BasicExample",
    level: LogLevel.DEBUG,
  }),
);
app.use(createLoggerMiddleware({ prefix: "[BasicExample]" }));
app.registerModule(UserModule);
app.listen(port);
