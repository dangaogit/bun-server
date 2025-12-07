import { Module, MODULE_METADATA_KEY } from '../di/module';
import { AuthenticationManager } from './authentication-manager';
import { JwtAuthenticationProvider } from './providers/jwt-provider';
import { OAuth2AuthenticationProvider } from './providers/oauth2-provider';
import { createSecurityFilter } from './filter';
import { JWTUtil } from '../auth/jwt';
import { OAuth2Service } from '../auth/oauth2';
import { OAuth2Controller, OAUTH2_SERVICE_TOKEN, JWT_UTIL_TOKEN } from '../auth/controller';
import type { JWTConfig, OAuth2Client, UserInfo } from '../auth/types';

/**
 * 安全模块配置
 */
export interface SecurityModuleConfig {
  /**
   * JWT 配置
   */
  jwt: JWTConfig;
  /**
   * OAuth2 客户端列表
   */
  oauth2Clients?: OAuth2Client[];
  /**
   * 用户提供者（可选）
   */
  userProvider?: {
    findById(userId: string): Promise<UserInfo | null>;
  };
  /**
   * 是否启用 OAuth2 端点
   * @default true
   */
  enableOAuth2Endpoints?: boolean;
  /**
   * OAuth2 端点前缀
   * @default '/oauth2'
   */
  oauth2Prefix?: string;
  /**
   * 排除的路径列表（不需要认证）
   */
  excludePaths?: string[];
  /**
   * 默认认证要求
   * @default false
   */
  defaultAuthRequired?: boolean;
}

/**
 * 安全模块
 */
@Module({
  controllers: [],
  providers: [],
  middlewares: [],
})
export class SecurityModule {
  /**
   * 创建安全模块
   * @param config - 模块配置
   */
  public static forRoot(config: SecurityModuleConfig): typeof SecurityModule {
    // 创建 JWT 工具
    const jwtUtil = new JWTUtil(config.jwt);

    // 创建 OAuth2 服务
    const userProvider = config.userProvider
      ? async (userId: string) => config.userProvider!.findById(userId)
      : undefined;
    const oauth2Service = new OAuth2Service(
      jwtUtil,
      config.oauth2Clients || [],
      {},
      userProvider,
    );

    // 创建认证管理器
    const authenticationManager = new AuthenticationManager();
    authenticationManager.registerProvider(new JwtAuthenticationProvider(jwtUtil));
    authenticationManager.registerProvider(new OAuth2AuthenticationProvider(oauth2Service));

    // 创建安全过滤器
    const securityFilter = createSecurityFilter({
      authenticationManager,
      excludePaths: [
        ...(config.excludePaths || []),
        ...(config.enableOAuth2Endpoints !== false
          ? [config.oauth2Prefix || '/oauth2']
          : []),
      ],
      defaultAuthRequired: config.defaultAuthRequired ?? false,
    });

    const controllers: any[] = [];
    const providers: any[] = [];
    const middlewares: any[] = [];

    // 如果启用 OAuth2 端点，添加控制器
    if (config.enableOAuth2Endpoints !== false) {
      controllers.push(OAuth2Controller);
    }

    // 注册服务提供者
    providers.push(
      {
        provide: JWT_UTIL_TOKEN,
        useValue: jwtUtil,
      },
      {
        provide: OAUTH2_SERVICE_TOKEN,
        useValue: oauth2Service,
      },
      {
        provide: AuthenticationManager,
        useValue: authenticationManager,
      },
    );

    // 添加安全过滤器中间件
    middlewares.push(securityFilter);

    // 动态更新模块元数据
    const existingMetadata = Reflect.getMetadata(MODULE_METADATA_KEY, SecurityModule) || {};
    const metadata = {
      ...existingMetadata,
      controllers: [...(existingMetadata.controllers || []), ...controllers],
      providers: [...(existingMetadata.providers || []), ...providers],
      middlewares: [...(existingMetadata.middlewares || []), ...middlewares],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, SecurityModule);

    return SecurityModule;
  }
}

