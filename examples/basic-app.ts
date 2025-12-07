
import {
  Application,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  Body,
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
@ApiTags("Users")
class UserController {
  public constructor(
    @Inject(UserService) private readonly service: UserService,
    @Inject(LOGGER_TOKEN) private readonly logger: Logger,
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
    this.logger.info("Fetch user", { id });
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

// 应用模块，导入 Logger 和 Swagger 模块
@Module({
  imports: [LoggerModule, SwaggerModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
class AppModule {}

const app = new Application({ port });
app.registerModule(AppModule);
app.listen(port);

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📚 Swagger UI: http://localhost:${port}/swagger`);
console.log(`📄 Swagger JSON: http://localhost:${port}/swagger.json`);
