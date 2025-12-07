import 'reflect-metadata';

import {
  Application,
  Controller,
  GET,
  POST,
  Body,
  Module,
  SecurityModule,
  Auth,
  Inject,
  Injectable,
  JWT_UTIL_TOKEN,
  type JWTUtil,
  type UserInfo,
} from '@dangao/bun-server';

/**
 * 用户服务
 */
@Injectable()
class UserService {
  private readonly users = new Map<string, UserInfo>([
    [
      'user-1',
      {
        id: 'user-1',
        username: 'alice',
        roles: ['user', 'admin'],
      },
    ],
    [
      'user-2',
      {
        id: 'user-2',
        username: 'bob',
        roles: ['user'],
      },
    ],
  ]);

  /**
   * 根据 ID 查找用户
   */
  public findById(id: string): Promise<UserInfo | null> {
    return Promise.resolve(this.users.get(id) || null);
  }

  /**
   * 根据用户名查找用户
   */
  public findByUsername(username: string): UserInfo | null {
    for (const user of this.users.values()) {
      if (user.username === username) {
        return user;
      }
    }
    return null;
  }

  /**
   * 验证用户凭据
   */
  public async validateCredentials(
    username: string,
    password: string,
  ): Promise<UserInfo | null> {
    // 简化示例：实际应该验证密码哈希
    const user = this.findByUsername(username);
    if (user && password === 'password') {
      return user;
    }
    return null;
  }
}

/**
 * 用户控制器
 */
@Controller('/api/users')
class UserController {
  public constructor(
    @Inject(UserService) private readonly userService: UserService,
    @Inject(JWT_UTIL_TOKEN) private readonly jwtUtil: JWTUtil,
  ) {}

  /**
   * 登录端点（不需要认证）
   */
  @POST('/login')
  public async login(@Body() body: { username: string; password: string }) {
    const user = await this.userService.validateCredentials(
      body.username,
      body.password,
    );

    if (!user) {
      return {
        error: 'Invalid credentials',
      };
    }

    // 生成访问令牌
    const accessToken = this.jwtUtil.generateAccessToken({
      sub: user.id,
      username: user.username,
      roles: user.roles,
    });

    // 生成刷新令牌
    const refreshToken = this.jwtUtil.generateRefreshToken({
      sub: user.id,
      username: user.username,
      roles: user.roles,
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: 3600,
    };
  }

  /**
   * 获取当前用户信息（需要认证）
   * 注意：用户信息通过认证中间件注入到 Context，这里简化处理
   */
  @GET('/me')
  @Auth()
  public getMe() {
    // 在实际使用中，应该通过 Context 参数装饰器获取用户信息
    return {
      message: 'User information (requires authentication)',
    };
  }

  /**
   * 获取所有用户（需要管理员权限）
   */
  @GET('/')
  @Auth({ roles: ['admin'] })
  public getAllUsers() {
    return {
      users: [
        { id: 'user-1', username: 'alice' },
        { id: 'user-2', username: 'bob' },
      ],
    };
  }

  /**
   * 公开端点（不需要认证）
   */
  @GET('/public')
  public getPublicInfo() {
    return {
      message: 'This is public information',
    };
  }
}

/**
 * 应用模块
 */
@Module({
  imports: [
    // 配置安全模块（推荐方式）
    SecurityModule.forRoot({
      jwt: {
        secret: 'your-secret-key-change-in-production',
        accessTokenExpiresIn: 3600, // 1 hour
        refreshTokenExpiresIn: 86400 * 7, // 7 days
      },
      oauth2Clients: [
        {
          clientId: 'my-client',
          clientSecret: 'my-secret',
          redirectUris: ['http://localhost:3000/callback'],
          grantTypes: ['authorization_code', 'refresh_token'],
        },
      ],
      enableOAuth2Endpoints: true,
      excludePaths: ['/api/users/login', '/api/users/public'],
      defaultAuthRequired: false, // 默认不要求认证，通过 @Auth() 装饰器控制
      userProvider: {
        findById: async (userId: string) => {
          return await new UserService().findById(userId);
        },
      },
    }),
  ],
  controllers: [UserController],
  providers: [UserService],
})
class AppModule {}

const port = Number(process.env.PORT ?? 3000);
const app = new Application({ port });

app.registerModule(AppModule);
app.listen();

console.log(`🚀 Server running on http://localhost:${port}`);
console.log(`📚 OAuth2 Authorize: http://localhost:${port}/oauth2/authorize?client_id=my-client&redirect_uri=http://localhost:3000/callback&response_type=code`);
console.log(`🔐 Login: POST http://localhost:${port}/api/users/login`);
console.log(`👤 Get Me: GET http://localhost:${port}/api/users/me (requires Bearer token)`);

