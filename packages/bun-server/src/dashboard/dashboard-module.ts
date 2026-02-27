import { Module, MODULE_METADATA_KEY } from '../di/module';
import { DashboardService } from './controller';
import { DashboardExtension } from './dashboard-extension';
import type { DashboardModuleOptions } from './types';

/**
 * Dashboard 模块
 * 提供监控 Web UI，可视化指标、健康状态、路由和系统信息
 */
@Module({
  extensions: [],
  controllers: [],
  providers: [],
})
export class DashboardModule {
  /**
   * 创建 Dashboard 模块
   * @param options - 模块配置
   */
  public static forRoot(
    options: DashboardModuleOptions = {},
  ): typeof DashboardModule {
    const path = options.path ?? '/_dashboard';
    const basePath = path.endsWith('/') ? path.slice(0, -1) : path;
    const service = new DashboardService(basePath, options.auth);
    const extension = new DashboardExtension(service);

    const existingMetadata =
      Reflect.getMetadata(MODULE_METADATA_KEY, DashboardModule) || {};
    const metadata = {
      ...existingMetadata,
      extensions: [extension],
    };
    Reflect.defineMetadata(MODULE_METADATA_KEY, metadata, DashboardModule);

    return DashboardModule;
  }
}
