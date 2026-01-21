import { Module, MODULE_METADATA_KEY } from '../di/module';
import { AuthenticationManager } from './authentication-manager';
import { JwtAuthenticationProvider } from './providers/jwt-provider';
import { OAuth2AuthenticationProvider } from './providers/oauth2-provider';
import { createSecurityFilter, getGuardRegistry, registerReflector } from './filter';
import { JWTUtil } from '../auth/jwt';
import { OAuth2Service } from '../auth/oauth2';
import { OAuth2Controller, OAUTH2_SERVICE_TOKEN, JWT_UTIL_TOKEN } from '../auth/controller';
import type { JWTConfig, OAuth2Client, UserInfo } from '../auth/types';
import type { GuardType } from './guards/types';
import { GUARD_REGISTRY_TOKEN } from './guards/types';
import { GuardRegistry } from './guards/guard-registry';
import { Reflector, REFLECTOR_TOKEN } from './guards/reflector';

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
  /**
   * 全局守卫列表
   */
  globalGuards?: GuardType[];
}

/**
 * 内部存储：容器引用和守卫注册表
 */
let _guardRegistry: GuardRegistry | null = null;

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
    authenticationManager.registerProvider(
      new OAuth2AuthenticationProvider(oauth2Service, jwtUtil),
    );

    // 创建守卫注册表（每次 forRoot 都创建新实例，避免测试间污染）
    const guardRegistry = new GuardRegistry();
    // 清理旧的 registry（如果存在）
    if (_guardRegistry) {
      _guardRegistry.clearGlobalGuards();
    }
    _guardRegistry = guardRegistry;

    // 添加全局守卫
    if (config.globalGuards && config.globalGuards.length > 0) {
      guardRegistry.addGlobalGuards(...config.globalGuards);
    }

    // 创建 Reflector
    const reflector = new Reflector();

    // 创建安全过滤器（暂时不传 container，将在模块注册时更新）
    const securityFilter = createSecurityFilter({
      authenticationManager,
      excludePaths: [
        ...(config.excludePaths || []),
        ...(config.enableOAuth2Endpoints !== false
          ? [config.oauth2Prefix || '/oauth2']
          : []),
      ],
      defaultAuthRequired: config.defaultAuthRequired ?? false,
      guardRegistry,
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
      {
        provide: GUARD_REGISTRY_TOKEN,
        useValue: guardRegistry,
      },
      {
        provide: REFLECTOR_TOKEN,
        useValue: reflector,
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
      // 导出服务，让其他模块可以使用
      exports: [
        ...(existingMetadata.exports || []),
        JWT_UTIL_TOKEN,
        OAUTH2_SERVICE_TOKEN,
        AuthenticationManager,
        GUARD_REGISTRY_TOKEN,
        REFLECTOR_TOKEN,
      ],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, SecurityModule);

    return SecurityModule;
  }

  /**
   * 获取守卫注册表
   * @returns 守卫注册表实例
   */
  public static getGuardRegistry(): GuardRegistry | null {
    return _guardRegistry;
  }

  /**
   * 添加全局守卫
   * @param guards - 守卫类或实例
   */
  public static addGlobalGuards(...guards: GuardType[]): void {
    if (_guardRegistry) {
      _guardRegistry.addGlobalGuards(...guards);
    }
  }

  /**
   * 重置模块状态（主要用于测试）
   */
  public static reset(): void {
    if (_guardRegistry) {
      _guardRegistry.clearGlobalGuards();
    }
    _guardRegistry = null;
    // 清除模块元数据
    Reflect.deleteMetadata(MODULE_METADATA_KEY, SecurityModule);
  }
}

