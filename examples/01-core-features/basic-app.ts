
import {
  Application,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  Body,
  CONFIG_SERVICE_TOKEN,
  ConfigModule,
  ConfigService,
  Controller,
  GET,
  Inject,
  Injectable,
  IsString,
  LOGGER_TOKEN,
  LoggerModule,
  LogLevel,
  Module,
  Param,
  POST,
  SwaggerModule,
  Validate,
} from "@dangao/bun-server";
import type { Logger } from "@dangao/logsmith";

interface UserService {
  find(id: string): Promise<{ id: string; name: string } | undefined>;
  create(name: string): { id: string; name: string };
}

const UserService = Symbol("UserService");

@Injectable()
class UserServiceImpl implements UserService {
  private readonly users = new Map<string, { id: string; name: string }>([[
    "1",
    { id: "1", name: "Alice" },
  ]]);

  public async find(id: string) {
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
@ApiTags("Users")
class UserController {
  public constructor(
    private readonly service: UserService,
    @Inject(LOGGER_TOKEN) private readonly logger: Logger,
    @Inject(CONFIG_SERVICE_TOKEN)
    private readonly config: ConfigService,
  ) {}

  @GET("/:id")
  @ApiOperation({
    summary: "Get user by ID",
    description: "Retrieve a user by their unique identifier",
    operationId: "getUser",
  })
  @ApiResponse({
    status: 200,
    description: "User found",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: "User not found",
    schema: {
      type: "object",
      properties: {
        error: { type: "string" },
      },
    },
  })
  public getUser(@Param("id") id: string) {
    const appName = this.config.get<string>("app.name", "Basic App");
    this.logger.info(`[${appName}] Fetch user`, { id });
    const user = this.service.find(id);
    if (!user) {
      return { error: "Not Found" };
    }
    return user;
  }

  @POST("/")
  @ApiOperation({
    summary: "Create a new user",
    description: "Create a new user with the provided name",
    operationId: "createUser",
  })
  @ApiBody({
    description: "User creation data",
    required: true,
    schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "User name" },
      },
      required: ["name"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "User created successfully",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
      },
    },
  })
  public createUser(@Body("name") @Validate(IsString()) name: string) {
    const appName = this.config.get<string>("app.name", "Basic App");
    this.logger.info(`[${appName}] Create user`, { name });
    return this.service.create(name);
  }
}

@Module({
  controllers: [UserController],
  providers: [{
    provide: UserService,
    useClass: UserServiceImpl,
  }],
  exports: [UserServiceImpl],
})
class UserModule {}

const port = Number(process.env.PORT ?? 3100);

// 配置 ConfigModule（应用名称等）
ConfigModule.forRoot({
  defaultConfig: {
    app: {
      name: "Basic App",
      port,
    },
  },
});

// 配置 Logger 模块
LoggerModule.forRoot({
  logger: {
    prefix: "BasicExample",
    level: LogLevel.DEBUG,
  },
  enableRequestLogging: true,
  requestLoggingPrefix: "[BasicExample]",
});

// 配置 Swagger 模块
SwaggerModule.forRoot({
  info: {
    title: "Basic App API",
    version: "1.0.0",
    description: "A basic example API with Swagger documentation",
  },
  servers: [
    {
      url: `http://localhost:${port}`,
      description: "Local development server",
    },
  ],
  uiPath: "/swagger",
  jsonPath: "/swagger.json",
  uiTitle: "Basic App API Documentation",
  enableUI: true,
});

// 应用模块，导入 Config、Logger 和 Swagger 模块
@Module({
  imports: [ConfigModule, LoggerModule, SwaggerModule],
  controllers: [UserController],
  providers: [{
    provide: UserService,
    useClass: UserServiceImpl,
  }],
  exports: [UserService],
})
class AppModule {}

const app = new Application({ port });
app.registerModule(AppModule);
app.listen(port);

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📚 Swagger UI: http://localhost:${port}/swagger`);
console.log(`📄 Swagger JSON: http://localhost:${port}/swagger.json`);
