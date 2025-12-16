import { Module, MODULE_METADATA_KEY, type ModuleProvider } from '../di/module';
import { CONFIG_CENTER_TOKEN } from '../microservice/config-center/types';
import type { ConfigCenter } from '../microservice/config-center/types';
import { ControllerRegistry } from '../controller/controller';

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

    // 如果启用配置中心集成，延迟初始化（等待 ConfigCenterModule 注册）
    // 初始化将在 Application.listen() 时执行，确保所有模块都已注册
    if (options.configCenter?.enabled) {
      // 保存配置中心选项，稍后在应用启动时初始化
      (service as any)._configCenterOptions = options.configCenter;
    }

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

  /**
   * 初始化配置中心集成（延迟初始化，在应用启动时调用）
   */
  public static async initializeConfigCenter(
    service: ConfigService,
    configCenterOptions: NonNullable<ConfigModuleOptions['configCenter']>,
  ): Promise<void> {
    // 加载配置中心配置
    const configCenterConfig = await ConfigModule.loadConfigCenterConfig(
      configCenterOptions,
    );
    if (configCenterConfig) {
      // 根据优先级合并配置
      const currentConfig = service.getAll();
      let updatedConfig: Record<string, unknown>;
      if (configCenterOptions.configCenterPriority !== false) {
        // 配置中心配置 > 环境变量 > 默认配置
        updatedConfig = {
          ...currentConfig,
          ...configCenterConfig,
        };
      } else {
        // 默认配置 > 环境变量 > 配置中心配置（配置中心配置不覆盖现有配置）
        updatedConfig = {
          ...configCenterConfig,
          ...currentConfig,
        };
      }
      service.updateConfig(updatedConfig as any);
    }

    // 设置配置变更监听
    if (configCenterOptions.configs) {
      ConfigModule.setupConfigCenterWatcher(service, configCenterOptions);
    }
  }

  /**
   * 从配置中心加载配置
   */
  private static async loadConfigCenterConfig(
    configCenterOptions: NonNullable<ConfigModuleOptions['configCenter']>,
    retries: number = 5,
    delay: number = 200,
  ): Promise<Record<string, unknown> | null> {
    const container = ControllerRegistry.getInstance().getContainer();
    
    // 重试机制：等待 ConfigCenterModule 注册完成
    let configCenter: ConfigCenter | undefined;
    for (let i = 0; i < retries; i++) {
      configCenter = container.resolve<ConfigCenter>(CONFIG_CENTER_TOKEN);
      if (configCenter) {
        break;
      }
      if (i < retries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    if (!configCenter) {
      console.warn(
        '[ConfigModule] ConfigCenter not found after retries, skipping config center integration. ' +
        'Make sure ConfigCenterModule is registered before ConfigModule.',
      );
      return null;
    }

    try {

      if (!configCenterOptions.configs || configCenterOptions.configs.size === 0) {
        return null;
      }

      const configMap: Record<string, unknown> = {};

      // 并行加载所有配置
      const loadPromises: Promise<void>[] = [];
      for (const [configPath, configInfo] of configCenterOptions.configs.entries()) {
        loadPromises.push(
          configCenter
            .getConfig(
              configInfo.dataId,
              configInfo.groupName,
              configInfo.namespaceId,
            )
            .then((result) => {
              // 解析配置内容（支持 JSON）
              try {
                const parsed = JSON.parse(result.content);
                ConfigModule.setValueByPath(configMap, configPath, parsed);
              } catch {
                // 如果不是 JSON，直接使用字符串值
                ConfigModule.setValueByPath(configMap, configPath, result.content);
              }
            })
            .catch((error) => {
              console.error(
                `[ConfigModule] Failed to load config ${configInfo.dataId}:`,
                error,
              );
            }),
        );
      }

      await Promise.all(loadPromises);

      return configMap;
    } catch (error) {
      console.error('[ConfigModule] Failed to load config center config:', error);
      return null;
    }
  }

  /**
   * 设置配置中心监听器
   */
  private static setupConfigCenterWatcher(
    service: ConfigService,
    configCenterOptions: NonNullable<ConfigModuleOptions['configCenter']>,
  ): void {
    try {
      const container = ControllerRegistry.getInstance().getContainer();
      const configCenter = container.resolve<ConfigCenter>(CONFIG_CENTER_TOKEN);

      if (!configCenter || !configCenterOptions.configs) {
        return;
      }

      // 为每个配置设置监听器
      for (const [configPath, configInfo] of configCenterOptions.configs.entries()) {
        configCenter.watchConfig(
          configInfo.dataId,
          configInfo.groupName,
          (result) => {
            try {
              // 解析配置内容
              let parsedValue: unknown;
              try {
                parsedValue = JSON.parse(result.content);
              } catch {
                parsedValue = result.content;
              }

              // 更新配置服务
              const currentConfig = service.getAll();
              const updatedConfig = {
                ...currentConfig,
              };
              ConfigModule.setValueByPath(updatedConfig, configPath, parsedValue);
              service.updateConfig(updatedConfig as any);

              console.log(
                `[ConfigModule] Config updated: ${configPath} from ${configInfo.dataId}`,
              );
            } catch (error) {
              console.error(
                `[ConfigModule] Failed to update config ${configPath}:`,
                error,
              );
            }
          },
          configInfo.namespaceId,
        );
      }
    } catch (error) {
      console.error(
        '[ConfigModule] Failed to setup config center watcher:',
        error,
      );
    }
  }

  /**
   * 根据路径设置对象值（支持点号路径）
   */
  private static setValueByPath(
    obj: Record<string, unknown>,
    path: string,
    value: unknown,
  ): void {
    const segments = path.split('.');
    let current: Record<string, unknown> = obj;

    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i]!;
      // 检查是否需要创建嵌套对象
      // 注意：typeof null === 'object'，所以需要明确排除 null
      if (
        !(segment in current) ||
        current[segment] == null ||
        typeof current[segment] !== 'object'
      ) {
        current[segment] = {};
      }
      current = current[segment] as Record<string, unknown>;
    }

    current[segments[segments.length - 1]!] = value;
  }
}


