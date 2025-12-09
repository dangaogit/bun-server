import { Module, MODULE_METADATA_KEY, type ModuleProvider } from '../di/module';

import { ConfigService } from './service';
import { CONFIG_SERVICE_TOKEN, type ConfigModuleOptions } from './types';

@Module({
  providers: [],
})
export class ConfigModule {
  /**
   * 创建配置模块
   * @param options - 模块配置
   */
  public static forRoot(
    options: ConfigModuleOptions = {},
  ): typeof ConfigModule {
    const providers: ModuleProvider[] = [];

    const env = ConfigModule.snapshotEnv();
    const defaultConfig = (options.defaultConfig ?? {}) as Record<
      string,
      unknown
    >;
    const loadedConfig =
      (options.load ? options.load(env) : {}) as Record<string, unknown>;

    // 默认配置 < 环境变量加载配置
    const mergedConfig = {
      ...defaultConfig,
      ...loadedConfig,
    } as Record<string, unknown>;

    const service = new ConfigService(mergedConfig, options.namespace);

    if (options.validate) {
      options.validate(mergedConfig);
    }

    providers.push(
      {
        provide: CONFIG_SERVICE_TOKEN,
        useValue: service,
      },
      ConfigService,
    );

    const existingMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, ConfigModule) || {};
    const metadata = {
      ...existingMetadata,
      providers: [...(existingMetadata.providers || []), ...providers],
      exports: [
        ...(existingMetadata.exports || []),
        CONFIG_SERVICE_TOKEN,
        ConfigService,
      ],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, ConfigModule);

    return ConfigModule;
  }

  /**
   * 获取环境变量快照
   * 方便测试和未来扩展（如 .env 文件解析）
   */
  private static snapshotEnv(): Record<string, string | undefined> {
    const env: Record<string, string | undefined> = {};
    for (const [key, value] of Object.entries(process.env)) {
      env[key] = value;
    }
    return env;
  }
}


